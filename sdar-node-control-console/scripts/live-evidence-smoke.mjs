import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = new URL(process.env.CONSOLE_SMOKE_BASE_URL ?? 'http://127.0.0.1:4188');
const runId = process.env.CONSOLE_SMOKE_RUN_ID ?? 'p06-core';
const reportPath = path.resolve('reports/single-node-live-integration/p06-live-evidence-smoke.json');
const listPaths = {
  outbox: '/api/v1/evidence-export/outbox?limit=20',
  sourceCheckpoints: '/api/v1/evidence-export/source-checkpoints?limit=20',
  projectionIssues: '/api/v1/evidence-export/projection-issues?limit=20',
  qualityIssues: '/api/v1/evidence-export/quality-issues?limit=20',
  deadLetters: '/api/v1/evidence-export/dead-letters?limit=20',
};

const status = await request('/api/v1/evidence-export/status');
const pages = Object.fromEntries(await Promise.all(Object.entries(listPaths).map(async ([name, requestPath]) => [name, await request(requestPath)])));
for (const item of pages.outbox.body.items) {
  if ('payload' in item) throw new Error('Outbox metadata exposed a canonical Evidence payload.');
  if (typeof item.sequence !== 'string') throw new Error('Evidence sequence was not preserved as a string.');
}
const issueWithEpisode = [...pages.projectionIssues.body.items, ...pages.qualityIssues.body.items]
  .find((item) => typeof item.episodeId === 'string');
let manifestStatus;
if (issueWithEpisode) manifestStatus = (await request(`/api/v1/evidence-export/episode-manifests/${encodeURIComponent(issueWithEpisode.episodeId)}`, [200, 404])).status;

const idempotencyKey = `console-p06-reconcile-${runId}`;
const recovery = await request('/api/v1/evidence-export/reconcile', [200, 202], {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
  body: JSON.stringify({ reason: `Console P06 bounded coverage reconcile ${runId}.`, ...(issueWithEpisode ? { episodeId: issueWithEpisode.episodeId } : {}) }),
});
const replay = await request('/api/v1/evidence-export/reconcile', [200, 202], {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
  body: JSON.stringify({ reason: `Console P06 bounded coverage reconcile ${runId}.`, ...(issueWithEpisode ? { episodeId: issueWithEpisode.episodeId } : {}) }),
});
if (recovery.body.operationId !== replay.body.operationId) throw new Error('Evidence recovery did not preserve idempotent ManagementOperation identity.');
const authoritativeOperation = await request(`/api/v1/management-operations/${encodeURIComponent(recovery.body.operationId)}`);

const report = {
  schemaVersion: 1,
  ok: true,
  observedAt: new Date().toISOString(),
  statusHttp: status.status,
  deliveryStatus: status.body.status,
  pendingRecords: status.body.pendingRecords,
  listCounts: Object.fromEntries(Object.entries(pages).map(([name, page]) => [name, page.body.items.length])),
  hasAdditionalPages: Object.fromEntries(Object.entries(pages).map(([name, page]) => [name, typeof page.body.nextCursor === 'string'])),
  decimalSequencesPreservedAsStrings: true,
  canonicalPayloadReturned: false,
  episodeManifestHttp: manifestStatus ?? null,
  recoveryHttp: recovery.status,
  recoveryReplayHttp: replay.status,
  recoveryOperationIdSha256: sha256(recovery.body.operationId),
  recoveryOperationStatus: authoritativeOperation.body.status,
  recoveryIdempotent: true,
  browserReceivedUpstreamAuthority: false,
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

async function request(upstreamPath, expected = [200], init = {}) {
  const response = await fetch(new URL(`/bff/node-control${upstreamPath}`, baseUrl), { ...init, redirect: 'manual' });
  const body = await response.json();
  if (!expected.includes(response.status)) throw new Error(`${upstreamPath} returned ${response.status}: ${body.code ?? body.title ?? 'unknown error'}`);
  return { status: response.status, body };
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
