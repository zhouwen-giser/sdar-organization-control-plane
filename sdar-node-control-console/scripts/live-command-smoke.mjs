import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const baseUrl = new URL(process.env.CONSOLE_LIVE_BASE_URL ?? 'http://127.0.0.1:4188');
const runId = process.env.CONSOLE_LIVE_RUN_ID ?? randomUUID();
const configurationId = `console-p04-${runId}`;
const createdAt = new Date().toISOString();
const content = { consoleProbe: true, runId };
const draft = {
  configurationId,
  targetType: 'runtime_policy',
  targetId: `console-probe-${runId}`,
  revision: 1,
  status: 'draft',
  applyMode: 'new_task_only',
  content,
  checksum: createHash('sha256').update(canonicalJson(content)).digest('hex'),
  createdBy: 'sdar-node-control-console-p04',
  createdAt,
};
const keys = {
  create: `console-p04-create-${runId}`,
  invalid: `console-p04-invalid-${runId}`,
  stale: `console-p04-stale-${runId}`,
  validate: `console-p04-validate-${runId}`,
  publish: `console-p04-publish-${runId}`,
  readiness: `console-p04-readiness-${runId}`,
};

const create = await request('/bff/node-control/api/v1/configuration-revisions', {
  method: 'POST', idempotencyKey: keys.create, body: draft, expected: [201],
});
const createReplay = await request('/bff/node-control/api/v1/configuration-revisions', {
  method: 'POST', idempotencyKey: keys.create, body: draft, expected: [201],
});
const createConflictingReplay = await request('/bff/node-control/api/v1/configuration-revisions', {
  method: 'POST', idempotencyKey: keys.create, body: { ...draft, targetId: `${draft.targetId}-changed` }, expected: [409, 500],
});
const invalidContent = { apiToken: 'plaintext-is-forbidden' };
const invalid = await request('/bff/node-control/api/v1/configuration-revisions', {
  method: 'POST', idempotencyKey: keys.invalid, body: {
    ...draft,
    configurationId: `${configurationId}-invalid`,
    targetId: `${draft.targetId}-invalid`,
    content: invalidContent,
    checksum: createHash('sha256').update(canonicalJson(invalidContent)).digest('hex'),
  }, expected: [422],
});
const current = await request(`/bff/node-control/api/v1/configuration-revisions/${encodeURIComponent(configurationId)}/1`, { expected: [200] });
const stale = await request(`/bff/node-control/api/v1/configuration-revisions/${encodeURIComponent(configurationId)}/1/validate`, {
  method: 'POST', idempotencyKey: keys.stale, ifMatch: '"console-stale-etag"', body: { reason: 'Prove stale ETag conflict.', expectedRevision: 1 }, expected: [412],
});
const validate = await request(`/bff/node-control/api/v1/configuration-revisions/${encodeURIComponent(configurationId)}/1/validate`, {
  method: 'POST', idempotencyKey: keys.validate, ifMatch: current.etag, body: { reason: 'Validate the inert Console P04 probe.', expectedRevision: 1 }, expected: [200],
});
const validateReplay = await request(`/bff/node-control/api/v1/configuration-revisions/${encodeURIComponent(configurationId)}/1/validate`, {
  method: 'POST', idempotencyKey: keys.validate, ifMatch: current.etag, body: { reason: 'Validate the inert Console P04 probe.', expectedRevision: 1 }, expected: [200],
});
const conflictingReplay = await request(`/bff/node-control/api/v1/configuration-revisions/${encodeURIComponent(configurationId)}/1/validate`, {
  method: 'POST', idempotencyKey: keys.validate, ifMatch: current.etag, body: { reason: 'Conflicting replay of the inert Console P04 probe.', expectedRevision: 1 }, expected: [409],
});
const publish = await request(`/bff/node-control/api/v1/configuration-revisions/${encodeURIComponent(configurationId)}/1/publish`, {
  method: 'POST', idempotencyKey: keys.publish, ifMatch: validate.etag, body: { reason: 'Publish the inert Console P04 probe.', expectedRevision: 1 }, expected: [202],
});
const publishReplay = await request(`/bff/node-control/api/v1/configuration-revisions/${encodeURIComponent(configurationId)}/1/publish`, {
  method: 'POST', idempotencyKey: keys.publish, ifMatch: validate.etag, body: { reason: 'Publish the inert Console P04 probe.', expectedRevision: 1 }, expected: [202],
});
const operationId = publish.data?.operationId;
if (typeof operationId !== 'string') throw new Error('Publish did not return a ManagementOperation identifier.');
const publishOperation = await request(`/bff/node-control/api/v1/management-operations/${encodeURIComponent(operationId)}`, { expected: [200] });
const terminal = await request('/bff/node-control/api/v1/capability-readiness/home.light.read-state/1/evaluate', {
  method: 'POST', idempotencyKey: keys.readiness, body: { reason: 'Verify a bounded asynchronous command reaches a terminal operation.' }, expected: [202],
});
const audits = await request('/bff/node-control/api/v1/audit-events?pageSize=100', { expected: [200] });
const auditItems = Array.isArray(audits.data?.items) ? audits.data.items : [];
const auditMatches = auditItems.filter((item) => item?.aggregateId === configurationId || item?.aggregateId === operationId || item?.reason === 'Publish the inert Console P04 probe.');

const report = {
  schemaVersion: 1,
  status: 'completed',
  runId,
  configurationId,
  create: { status: create.status, etagPresent: Boolean(create.etag), replayStatus: createReplay.status, replayByteEquivalent: create.raw === createReplay.raw, replayResourceEquivalent: sameConfigurationIdentity(create.data, createReplay.data) },
  createConflictingReplay: problemResult(createConflictingReplay),
  idempotencyConflict: problemResult(conflictingReplay),
  validationFailure: problemResult(invalid),
  staleEtag: problemResult(stale),
  validate: { status: validate.status, etagPresent: Boolean(validate.etag), replayStatus: validateReplay.status, replayByteEquivalent: validate.raw === validateReplay.raw },
  publish: { status: publish.status, initialOperationStatus: publish.data.status, replayStatus: publishReplay.status, replayOperationIdStable: publishReplay.data?.operationId === operationId },
  publishOperation: { operationId, status: publishOperation.data?.status, errorCode: publishOperation.data?.errorCode ?? null },
  terminalOperation: { operationId: terminal.data?.operationId ?? null, status: terminal.data?.status, errorCode: terminal.data?.errorCode ?? null },
  audit: { status: audits.status, correlatedEntries: auditMatches.length },
  assertions: {
    createAndReplay: create.status === 201 && createReplay.status === 201 && sameConfigurationIdentity(create.data, createReplay.data),
    conflictingReplay: conflictingReplay.status === 409,
    invalidPayload: invalid.status === 422,
    stalePrecondition: stale.status === 412,
    validateAndReplay: validate.status === 200 && validateReplay.status === 200 && validate.raw === validateReplay.raw,
    acceptedNotApplied: publish.status === 202 && publish.data?.status !== 'succeeded',
    publishReplay: publishReplay.status === 202 && publishReplay.data?.operationId === operationId,
    terminalOperation: terminal.status === 202 && ['succeeded', 'failed', 'canceled'].includes(terminal.data?.status),
    auditCorrelation: auditMatches.length > 0,
  },
};
report.ok = Object.values(report.assertions).every(Boolean);
const reportPath = path.resolve(process.cwd(), process.env.CONSOLE_LIVE_COMMAND_REPORT ?? 'reports/single-node-live-integration/live-command-smoke.json');
await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: report.ok, reportPath, configurationId, operationStatus: report.terminalOperation.status }, null, 2));
if (!report.ok) process.exitCode = 1;

async function request(pathname, options = {}) {
  const headers = new Headers({ accept: 'application/json' });
  if (options.body !== undefined) headers.set('content-type', 'application/json');
  if (options.idempotencyKey) headers.set('idempotency-key', options.idempotencyKey);
  if (options.ifMatch) headers.set('if-match', options.ifMatch);
  const response = await fetch(new URL(pathname, baseUrl), {
    method: options.method ?? 'GET', headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body), redirect: 'manual',
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : undefined; } catch { data = raw; }
  if (!(options.expected ?? [200]).includes(response.status)) {
    throw new Error(`${options.method ?? 'GET'} ${pathname} returned ${response.status}, expected ${(options.expected ?? [200]).join('/')}: ${raw.slice(0, 500)}`);
  }
  return { status: response.status, data, raw, etag: response.headers.get('etag') ?? undefined, retryAfter: response.headers.get('retry-after') ?? undefined };
}

function problemResult(result) {
  return { status: result.status, code: result.data?.code ?? null, correlationIdPresent: typeof result.data?.correlationId === 'string', retryable: result.data?.retryable ?? null };
}

function sameConfigurationIdentity(left, right) {
  const fields = ['configurationId', 'targetType', 'targetId', 'revision', 'status', 'applyMode', 'checksum', 'createdBy', 'createdAt'];
  return fields.every((field) => left?.[field] === right?.[field]) && canonicalJson(left?.content) === canonicalJson(right?.content);
}

function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
}
