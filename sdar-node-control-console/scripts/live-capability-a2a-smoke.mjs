import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = new URL(process.env.CONSOLE_SMOKE_BASE_URL ?? 'http://127.0.0.1:4188');
const taskId = required(process.env.CONSOLE_P08_TASK_ID, 'CONSOLE_P08_TASK_ID');
const rejectedTaskId = required(process.env.CONSOLE_P08_REJECTED_TASK_ID, 'CONSOLE_P08_REJECTED_TASK_ID');
const rejectedTaskState = required(process.env.CONSOLE_P08_REJECTED_TASK_STATE, 'CONSOLE_P08_REJECTED_TASK_STATE');
const a2aReportFile = required(process.env.CONSOLE_P08_A2A_REPORT_FILE, 'CONSOLE_P08_A2A_REPORT_FILE');
const reportPath = path.resolve('reports/single-node-live-integration/p08-live-capability-a2a.json');
const a2a = JSON.parse(fs.readFileSync(a2aReportFile, 'utf8'));
if (a2a.status !== 'passed' || a2a.a2aReadOnlyReady !== true || a2a.task?.taskId !== taskId) {
  throw new Error('The authoritative A2A acceptance report does not match the requested Task.');
}
if (a2a.safety?.physicalWritesInvoked !== 0 || a2a.safety?.writeOperationsInvoked !== 0) {
  throw new Error('The A2A acceptance report contains a device write.');
}

const exposure = await request('/api/v1/a2a-exposures/home-lab-a2a-living-room-read-state/versions/1');
const task = await request(`/api/v1/tasks/${encodeURIComponent(taskId)}`);
const binding = await request(`/api/v1/tasks/${encodeURIComponent(taskId)}/capability-binding`);
const cards = await request('/api/v1/a2a-agent-card-revisions?pageSize=5');
const activeCard = cards.body.items.find((item) => item.status === 'active');

if (exposure.body.status !== 'published' || exposure.body.capabilityId !== 'home.living-room.read-state' || exposure.body.capabilityVersion !== 1) {
  throw new Error('The exact published A2A Exposure is unavailable.');
}
if (task.body.phase !== 'completed') throw new Error(`The accepted A2A Task is ${task.body.phase}.`);
if (binding.body.requestedCapabilityId !== 'home.living-room.read-state' || binding.body.capabilityVersion !== 1 || binding.body.exposureId !== 'home-lab-a2a-living-room-read-state' || binding.body.exposureVersion !== 1 || !/^[a-f0-9]{64}$/u.test(binding.body.bindingHash)) {
  throw new Error('The immutable Task Capability Binding is not exact.');
}
if (rejectedTaskState !== 'TASK_STATE_FAILED') throw new Error('The controlled requester fixture was not rejected as a failed A2A Task.');
if (!activeCard) throw new Error('No active Agent Card revision exists.');

const taskControls = [];
for (const action of ['pause', 'resume', 'cancel']) {
  const requestBody = JSON.stringify({ reason: `Console P08 exact ${action} contract probe.` });
  const response = await request(`/api/v1/tasks/${encodeURIComponent(taskId)}/${action}`, [404], {
    method: 'POST',
    headers: jsonHeaders(`console-p08-${action}-${taskId}`),
    body: requestBody,
  });
  if (response.body.code !== 'RESOURCE_NOT_FOUND') throw new Error(`${action} did not preserve the Node Control Problem Details response.`);
  taskControls.push({ action, httpStatus: response.status, code: response.body.code, requestSha256: sha256(requestBody), responseSha256: sha256(JSON.stringify(response.body)) });
}

const report = {
  schemaVersion: 1,
  status: 'external_blocker_recorded',
  observedAt: new Date().toISOString(),
  coreVertical: {
    passed: true,
    exposureId: exposure.body.exposureId,
    exposureVersion: exposure.body.version,
    capabilityId: binding.body.requestedCapabilityId,
    capabilityVersion: binding.body.capabilityVersion,
    taskIdSha256: sha256(taskId),
    taskPhase: task.body.phase,
    bindingIdSha256: sha256(binding.body.bindingId),
    bindingHash: binding.body.bindingHash,
    activeAgentCardRevision: activeCard.revision,
    modelBoundary: a2a.modelAuthority?.modelBoundary,
    mcpReadOperationCount: a2a.task?.operations?.length,
  },
  requesterRejection: { taskIdSha256: sha256(rejectedTaskId), a2aState: rejectedTaskState, nodeControlProjectionExpected: false },
  taskControlExternalBlocker: {
    code: 'EXT-SDAR-NODE-CONTROL-TASK-CONTROL-001',
    expectedOperations: ['pauseTask', 'resumeTask', 'cancelTask'],
    observations: taskControls,
    owner: 'skill-driven-agent-runtime',
  },
  safety: { physicalDeviceWrites: 0, browserReceivedUpstreamAuthority: false },
  sourceLocks: {
    sdar: '816f25f86910a94cba260e9f84e98de92074b75f',
    smpp: '99302cf8d7871b677147c39530701790f8b7a051',
  },
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

function jsonHeaders(idempotencyKey) { return { 'content-type': 'application/json', 'idempotency-key': idempotencyKey }; }
async function request(upstreamPath, expected = [200], init = {}) {
  const response = await fetch(new URL(`/bff/node-control${upstreamPath}`, baseUrl), { ...init, redirect: 'manual' });
  const body = await response.json();
  if (!expected.includes(response.status)) throw new Error(`${upstreamPath} returned ${response.status}: ${body.code ?? body.title ?? 'unknown error'}`);
  return { status: response.status, body };
}
function required(value, name) { if (!value?.trim()) throw new Error(`${name} is required.`); return value.trim(); }
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
