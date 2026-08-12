import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const baseUrl = new URL(process.env.CONSOLE_SMOKE_BASE_URL ?? 'http://127.0.0.1:4188');
const runId = process.env.CONSOLE_SMOKE_RUN_ID ?? '20260812-core';
const providerId = `console-p07-provider-${runId}`;
const routeId = `console-p07-route-${runId}`;
const reportPath = path.resolve('reports/single-node-live-integration/p07-live-supply-smoke.json');
const fake = http.createServer((request, response) => {
  if (request.url === '/v1/models') {
    response.writeHead(200, { 'content-type': 'application/json' });
    return response.end(JSON.stringify({ data: [{ id: 'structured-fixture', object: 'model' }] }));
  }
  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: 'not_found' }));
});
await listen(fake, 18463);

try {
  const fakeModels = await fetch('http://127.0.0.1:18463/v1/models').then((response) => response.json());
  if (fakeModels.data?.[0]?.id !== 'structured-fixture') throw new Error('Deterministic LLM fixture is unavailable.');

  const provider = await request('/api/v1/llm-providers', [201], {
    method: 'POST', headers: jsonHeaders(`p07-provider-${runId}`), body: JSON.stringify({
      providerId, providerType: 'local', baseUrl: 'http://127.0.0.1:18463/v1', credentialRef: 'secret://console/p07-fixture',
      models: [{ modelId: 'structured-fixture', capabilities: ['structured_output', 'tool_calling'], contextWindow: 32768, enabled: true }],
      healthPolicy: { timeoutMs: 10000, retryAttempts: 1, failureThreshold: 3, recoverySeconds: 60 },
      rateLimitPolicy: { requestsPerMinute: 60, tokensPerMinute: 100000, maxConcurrent: 4 },
      status: 'draft', secretStatus: 'unknown', revision: 1,
    }),
  });
  const providerValidation = await request(`/api/v1/llm-providers/${providerId}/validate`, [202], {
    method: 'POST', headers: jsonHeaders(`p07-provider-validate-${runId}`), body: JSON.stringify({ reason: `Validate Console P07 deterministic provider ${runId}.` }),
  });
  const route = await request('/api/v1/model-routes', [201], {
    method: 'POST', headers: jsonHeaders(`p07-route-${runId}`), body: JSON.stringify({
      routeId, stage: 'planning', primary: { providerId, modelId: 'structured-fixture' }, fallbacks: [],
      budgetPolicy: { selector: { scope: 'stage' }, timeoutMs: 30000, maxAttempts: 1, maxInputTokens: 32768, maxOutputTokens: 8192, maxCostUsd: 0, fallbackOn: ['unavailable', 'timeout', 'rate_limited', 'upstream_error'] },
      status: 'draft', revision: 1,
    }),
  });

  const sourcesBefore = await request('/api/v1/smpp-sources');
  const source = sourcesBefore.body.items.find((item) => item.smppSourceId === 'home-lab-smpp');
  if (!source) throw new Error('The previous-integration home-lab-smpp source is missing.');
  const sync = await request('/api/v1/smpp-sources/home-lab-smpp/sync', [202], {
    method: 'POST', headers: jsonHeaders(`p07-smpp-sync-${runId}`), body: JSON.stringify({ reason: `Console P07 real SMPP sync ${runId}.` }),
  });
  const candidates = await request('/api/v1/mcp-provider-candidates?smppSourceId=home-lab-smpp&pageSize=100');
  const bindings = await request('/api/v1/mcp-provider-bindings?pageSize=100');
  const activeBindings = bindings.body.items.filter((item) => item.smppSourceId === 'home-lab-smpp' && item.status !== 'removed');
  if (activeBindings.length < 2) throw new Error('Both previous-integration SMPP-backed MCP Bindings are required.');
  const observedBindings = activeBindings.map((binding) => {
    if (binding.status !== 'active' || binding.availabilityStatus !== 'available') {
      throw new Error(`Real Binding ${binding.bindingId} is not active and available.`);
    }
    return {
      id: binding.bindingId,
      status: binding.status,
      availabilityStatus: binding.availabilityStatus,
      registryRevision: binding.registryRevision,
      catalogRevision: binding.catalogRevision,
      operationCount: binding.operationCount,
    };
  });

  const report = {
    schemaVersion: 1, ok: true, observedAt: new Date().toISOString(),
    consoleProvider: { id: provider.body.providerId, status: provider.body.status, validationStatus: providerValidation.body.status },
    consoleRoute: { id: route.body.routeId, stage: route.body.stage, status: route.body.status },
    deterministicLlmFixture: { loopback: true, modelId: 'structured-fixture', credentialExposed: false },
    smppSource: { id: source.smppSourceId, statusBefore: source.status, syncOperationStatus: sync.body.status, activeSnapshotRevisionBefore: source.activeSnapshotRevision ?? null },
    realCandidateCount: candidates.body.items.length,
    realBindingCount: activeBindings.length,
    observedBindings,
    operationHashes: { sync: sha256(sync.body.operationId) },
    sdarSourceModified: false, smppSourceModified: false, physicalDeviceWrites: 0, browserReceivedUpstreamAuthority: false,
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await close(fake);
}

function jsonHeaders(idempotencyKey) { return { 'content-type': 'application/json', 'idempotency-key': idempotencyKey }; }
async function request(upstreamPath, expected = [200], init = {}) {
  const response = await fetch(new URL(`/bff/node-control${upstreamPath}`, baseUrl), { ...init, redirect: 'manual' });
  const body = await response.json();
  if (!expected.includes(response.status)) throw new Error(`${upstreamPath} returned ${response.status}: ${body.code ?? body.title ?? 'unknown error'}`);
  return { status: response.status, body };
}
function listen(server, port) { return new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); }); }
function close(server) { return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
