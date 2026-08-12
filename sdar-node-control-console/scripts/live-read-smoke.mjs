import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const baseUrl = new URL(process.env.CONSOLE_LIVE_BASE_URL || 'http://127.0.0.1:4188');
const reportPath = path.resolve(process.env.CONSOLE_LIVE_READ_REPORT || 'reports/single-node-live-integration/live-read-smoke.json');

const endpoints = [
  { name: 'declaration', path: '/.well-known/sdar-node', shape: 'object' },
  { name: 'nodeProfile', path: '/api/v1/node', shape: 'object' },
  { name: 'nodeHealth', path: '/api/v1/node/health', shape: 'object' },
  { name: 'configuration', path: '/api/v1/configuration-revisions', shape: 'page' },
  { name: 'llmProviders', path: '/api/v1/llm-providers', shape: 'page' },
  { name: 'modelRoutes', path: '/api/v1/model-routes', shape: 'page' },
  { name: 'smppSources', path: '/api/v1/smpp-sources', shape: 'page' },
  { name: 'mcpCandidates', path: '/api/v1/mcp-provider-candidates', shape: 'page' },
  { name: 'mcpBindings', path: '/api/v1/mcp-provider-bindings', shape: 'page' },
  { name: 'skills', path: '/api/v1/skills', shape: 'page' },
  { name: 'planTemplates', path: '/api/v1/plan-templates', shape: 'page' },
  { name: 'capabilities', path: '/api/v1/node-capabilities', shape: 'page' },
  { name: 'readiness', path: '/api/v1/capability-readiness', shape: 'page' },
  { name: 'a2aExposures', path: '/api/v1/a2a-exposures', shape: 'page' },
  { name: 'agentCards', path: '/api/v1/a2a-agent-card-revisions', shape: 'page' },
  { name: 'tasks', path: '/api/v1/tasks', shape: 'page' },
  { name: 'evidenceConfiguration', path: '/api/v1/evidence-export', shape: 'optional-object' },
  { name: 'evidenceStatus', path: '/api/v1/evidence-export/status', shape: 'object' },
  { name: 'operations', path: '/api/v1/management-operations', shape: 'page' },
  { name: 'audit', path: '/api/v1/audit-events', shape: 'page' },
];

function url(pathname) {
  return new URL(`/bff/node-control${pathname}`, baseUrl);
}

async function jsonResponse(pathname, init) {
  const response = await fetch(url(pathname), { ...init, redirect: 'manual' });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : undefined; } catch { body = undefined; }
  return { response, body };
}

const endpointResults = [];
const bodies = new Map();
for (const endpoint of endpoints) {
  const { response, body } = await jsonResponse(endpoint.path);
  const optionalMissing = endpoint.shape === 'optional-object' && response.status === 404;
  const shapeValid = optionalMissing
    || (endpoint.shape === 'page' ? body && Array.isArray(body.items) : body && typeof body === 'object' && !Array.isArray(body));
  const ok = (response.status === 200 || optionalMissing) && shapeValid;
  if (response.status === 200) bodies.set(endpoint.name, body);
  endpointResults.push({
    name: endpoint.name,
    path: endpoint.path,
    status: response.status,
    itemCount: endpoint.shape === 'page' && Array.isArray(body?.items) ? body.items.length : response.status === 200 ? 1 : 0,
    etagPresent: response.headers.has('etag'),
    optionalMissing,
    shapeValid: Boolean(shapeValid),
    ok,
  });
}

const details = [];
function addDetail(name, path) {
  if (path) details.push({ name, path });
}
const first = (name) => bodies.get(name)?.items?.[0];
const configuration = first('configuration');
addDetail('configuration', configuration && `/api/v1/configuration-revisions/${encodeURIComponent(configuration.configurationId)}/${encodeURIComponent(configuration.revision)}`);
const provider = first('llmProviders');
addDetail('llmProvider', provider && `/api/v1/llm-providers/${encodeURIComponent(provider.providerId)}`);
const route = first('modelRoutes');
addDetail('modelRoute', route && `/api/v1/model-routes/${encodeURIComponent(route.routeId)}`);
const source = first('smppSources');
addDetail('smppSource', source && `/api/v1/smpp-sources/${encodeURIComponent(source.smppSourceId)}`);
const binding = first('mcpBindings');
addDetail('mcpBinding', binding && `/api/v1/mcp-provider-bindings/${encodeURIComponent(binding.bindingId)}`);
const skill = first('skills');
addDetail('skill', skill && `/api/v1/skills/${encodeURIComponent(skill.skillId)}/versions/${encodeURIComponent(skill.version)}`);
const plan = first('planTemplates');
addDetail('planTemplate', plan && `/api/v1/plan-templates/${encodeURIComponent(plan.artifactId)}/versions/${encodeURIComponent(plan.version)}`);
const capability = first('capabilities');
addDetail('capability', capability && `/api/v1/node-capabilities/${encodeURIComponent(capability.capabilityId)}/versions/${encodeURIComponent(capability.version)}`);
addDetail('capabilityImplementations', capability && `/api/v1/node-capabilities/${encodeURIComponent(capability.capabilityId)}/versions/${encodeURIComponent(capability.version)}/implementations`);
const readiness = first('readiness');
addDetail('readiness', readiness && `/api/v1/capability-readiness/${encodeURIComponent(readiness.capabilityId)}/${encodeURIComponent(readiness.capabilityVersion)}`);
const exposure = first('a2aExposures');
addDetail('a2aExposure', exposure && `/api/v1/a2a-exposures/${encodeURIComponent(exposure.exposureId)}/versions/${encodeURIComponent(exposure.version)}`);
const card = first('agentCards');
addDetail('agentCard', card && `/api/v1/a2a-agent-card-revisions/${encodeURIComponent(card.revision)}`);
const task = first('tasks');
addDetail('task', task && `/api/v1/tasks/${encodeURIComponent(task.taskId)}`);
addDetail('taskBinding', task && `/api/v1/tasks/${encodeURIComponent(task.taskId)}/capability-binding`);
const operation = first('operations');
addDetail('operation', operation && `/api/v1/management-operations/${encodeURIComponent(operation.operationId)}`);

const detailResults = [];
for (const detail of details) {
  const { response, body } = await jsonResponse(detail.path);
  const optionalTaskBinding = detail.name === 'taskBinding' && response.status === 404;
  detailResults.push({ name: detail.name, status: response.status, object: Boolean(body && typeof body === 'object' && !Array.isArray(body)), optionalMissing: optionalTaskBinding, ok: (response.status === 200 && body && typeof body === 'object') || optionalTaskBinding });
}

const firstNode = await jsonResponse('/api/v1/node');
const etag = firstNode.response.headers.get('etag');
const stale = etag ? await jsonResponse('/api/v1/node', { headers: { 'if-none-match': etag } }) : undefined;

const firstPage = await jsonResponse('/api/v1/skills?pageSize=1');
const nextPageToken = typeof firstPage.body?.nextPageToken === 'string' ? firstPage.body.nextPageToken : undefined;
const secondPage = nextPageToken ? await jsonResponse(`/api/v1/skills?pageSize=1&pageToken=${encodeURIComponent(nextPageToken)}`) : undefined;

const sseAbort = new AbortController();
const sseTimeout = setTimeout(() => sseAbort.abort(), 3000);
let sse = { status: 0, contentType: '', cacheControl: '', firstFrameObserved: false, ok: false };
try {
  const response = await fetch(url('/api/v1/events'), { signal: sseAbort.signal });
  const reader = response.body?.getReader();
  const chunk = reader ? await reader.read() : { value: undefined };
  const text = chunk.value ? new TextDecoder().decode(chunk.value) : '';
  sse = {
    status: response.status,
    contentType: response.headers.get('content-type') ?? '',
    cacheControl: response.headers.get('cache-control') ?? '',
    firstFrameObserved: text.includes('data:') || text.includes('refetch-required'),
    ok: response.status === 200 && (response.headers.get('content-type') ?? '').startsWith('text/event-stream'),
  };
  await reader?.cancel();
} finally {
  clearTimeout(sseTimeout);
}

const configResponse = await fetch(new URL('/console-config', baseUrl));
const publicConfigText = await configResponse.text();
const publicConfig = JSON.parse(publicConfigText);
const publicConfigSafe = publicConfig.gatewayMode === 'live'
  && typeof publicConfig.activeDeploymentRole === 'string'
  && !/token|bearer|baseUrl|upstream|authorization/i.test(publicConfigText);

const report = {
  schemaVersion: 1,
  status: 'completed',
  endpointResults,
  detailResults,
  etag: { present: Boolean(etag), conditionalStatus: stale?.response.status ?? 0, stable: Boolean(etag) && stale?.response.headers.get('etag') === etag, ok: Boolean(etag) && (stale?.response.status === 200 || stale?.response.status === 304) && stale?.response.headers.get('etag') === etag },
  pagination: { firstStatus: firstPage.response.status, firstCount: firstPage.body?.items?.length ?? 0, nextPageTokenPresent: Boolean(nextPageToken), secondStatus: secondPage?.response.status ?? 0, secondCount: secondPage?.body?.items?.length ?? 0, ok: firstPage.response.status === 200 && Boolean(nextPageToken) && secondPage?.response.status === 200 },
  sse,
  publicConfig: { gatewayMode: publicConfig.gatewayMode, activeDeploymentRole: publicConfig.activeDeploymentRole, safe: publicConfigSafe },
};
report.ok = endpointResults.every((result) => result.ok)
  && detailResults.every((result) => result.ok)
  && report.etag.ok
  && report.pagination.ok
  && report.sse.ok
  && publicConfigSafe;

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ok: report.ok, endpoints: endpointResults.length, endpointPass: endpointResults.filter((item) => item.ok).length, details: detailResults.length, detailPass: detailResults.filter((item) => item.ok).length, etag: report.etag, pagination: report.pagination, sse: report.sse, publicConfigSafe }, null, 2));
if (!report.ok) process.exit(1);
