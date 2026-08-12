import type { ConsoleRecord, RecordKind } from '../domain';
import type { NodeControlResponse } from './HttpNodeControlGateway';

export interface LiveResourceDefinition {
  listPath: string;
  detailPath?: (id: string) => string;
}

function splitVersion(id: string) {
  const separator = id.lastIndexOf('@');
  return separator < 0 ? [id, ''] : [id.slice(0, separator), id.slice(separator + 1)];
}

export const LIVE_RESOURCES: Record<RecordKind, LiveResourceDefinition> = {
  configuration: {
    listPath: '/api/v1/configuration-revisions',
    detailPath: (id) => { const [configurationId, revision] = splitVersion(id); return `/api/v1/configuration-revisions/${encodeURIComponent(configurationId)}/${encodeURIComponent(revision)}`; },
  },
  llmProvider: { listPath: '/api/v1/llm-providers', detailPath: (id) => `/api/v1/llm-providers/${encodeURIComponent(id)}` },
  modelRoute: { listPath: '/api/v1/model-routes', detailPath: (id) => `/api/v1/model-routes/${encodeURIComponent(id)}` },
  smppSource: { listPath: '/api/v1/smpp-sources', detailPath: (id) => `/api/v1/smpp-sources/${encodeURIComponent(id)}` },
  mcpCandidate: { listPath: '/api/v1/mcp-provider-candidates' },
  mcpBinding: { listPath: '/api/v1/mcp-provider-bindings', detailPath: (id) => `/api/v1/mcp-provider-bindings/${encodeURIComponent(id)}` },
  skill: {
    listPath: '/api/v1/skills',
    detailPath: (id) => { const [skillId, version] = splitVersion(id); return `/api/v1/skills/${encodeURIComponent(skillId)}/versions/${encodeURIComponent(version)}`; },
  },
  planTemplate: {
    listPath: '/api/v1/plan-templates',
    detailPath: (id) => { const [artifactId, version] = splitVersion(id); return `/api/v1/plan-templates/${encodeURIComponent(artifactId)}/versions/${encodeURIComponent(version)}`; },
  },
  capability: {
    listPath: '/api/v1/node-capabilities',
    detailPath: (id) => { const [capabilityId, version] = splitVersion(id); return `/api/v1/node-capabilities/${encodeURIComponent(capabilityId)}/versions/${encodeURIComponent(version)}`; },
  },
  readiness: {
    listPath: '/api/v1/capability-readiness',
    detailPath: (id) => { const [capabilityId, version] = splitVersion(id); return `/api/v1/capability-readiness/${encodeURIComponent(capabilityId)}/${encodeURIComponent(version)}`; },
  },
  a2aExposure: {
    listPath: '/api/v1/a2a-exposures',
    detailPath: (id) => { const [exposureId, version] = splitVersion(id); return `/api/v1/a2a-exposures/${encodeURIComponent(exposureId)}/versions/${encodeURIComponent(version)}`; },
  },
  agentCard: { listPath: '/api/v1/a2a-agent-card-revisions', detailPath: (id) => `/api/v1/a2a-agent-card-revisions/${encodeURIComponent(id)}` },
  task: { listPath: '/api/v1/tasks', detailPath: (id) => `/api/v1/tasks/${encodeURIComponent(id)}` },
  operation: { listPath: '/api/v1/management-operations', detailPath: (id) => `/api/v1/management-operations/${encodeURIComponent(id)}` },
  audit: { listPath: '/api/v1/audit-events' },
  event: { listPath: '/api/v1/events' },
};

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.length > 0) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function identifier(kind: RecordKind, source: Record<string, unknown>) {
  const version = text(source, 'version');
  switch (kind) {
    case 'configuration': return text(source, 'configurationId');
    case 'llmProvider': return text(source, 'providerId');
    case 'modelRoute': return text(source, 'routeId');
    case 'smppSource': return text(source, 'smppSourceId');
    case 'mcpCandidate': return text(source, 'candidateId') ?? [text(source, 'smppSourceId'), text(source, 'externalProviderId'), text(source, 'externalServerId')].filter(Boolean).join(':');
    case 'mcpBinding': return text(source, 'bindingId');
    case 'skill': return versioned(text(source, 'skillId'), version);
    case 'planTemplate': return versioned(text(source, 'artifactId'), version);
    case 'capability': return versioned(text(source, 'capabilityId'), version);
    case 'readiness': return versioned(text(source, 'capabilityId'), text(source, 'capabilityVersion', 'version'));
    case 'a2aExposure': return versioned(text(source, 'exposureId'), version);
    case 'agentCard': return text(source, 'revision');
    case 'task': return text(source, 'taskId');
    case 'operation': return text(source, 'operationId');
    case 'audit': return text(source, 'auditId', 'auditEventId', 'eventId', 'id');
    case 'event': return text(source, 'eventId');
  }
}

function versioned(id?: string, version?: string) {
  if (!id) return undefined;
  return version ? `${id}@${version}` : id;
}

function displayName(kind: RecordKind, source: Record<string, unknown>, id: string) {
  return text(source, 'name', 'displayName', 'title', 'action', 'operationType', 'eventType', 'phase', 'externalProviderId')
    ?? (kind === 'readiness' ? text(source, 'capabilityId') : undefined)
    ?? id;
}

function status(source: Record<string, unknown>) {
  return text(source, 'status', 'phase', 'result', 'resultCode') ?? 'unknown';
}

function updatedAt(source: Record<string, unknown>) {
  return text(source, 'updatedAt', 'observedAt', 'evaluatedAt', 'generatedAt', 'completedAt', 'createdAt', 'occurredAt', 'lastSyncAt', 'boundAt') ?? '';
}

export function mapLiveResource(kind: RecordKind, value: unknown, response?: Pick<NodeControlResponse<unknown>, 'etag'>, asOf?: string): ConsoleRecord {
  if (!isObject(value)) throw new Error(`Node Control ${kind} item must be an object`);
  const id = identifier(kind, value);
  if (!id) throw new Error(`Node Control ${kind} item is missing its frozen identifier`);
  const sourceRevision = typeof value.revision === 'number' || typeof value.revision === 'string'
    ? value.revision
    : typeof value.snapshotVersion === 'number' ? value.snapshotVersion
      : typeof value.version === 'number' || typeof value.version === 'string' ? value.version : undefined;
  const observedAt = updatedAt(value);
  const fields = structuredClone(value);
  fields.__metadata = {
    ...(response?.etag ? { etag: response.etag } : {}),
    ...(sourceRevision !== undefined ? { sourceRevision } : {}),
    ...(observedAt ? { observedAt } : {}),
    ...(asOf ? { asOf } : {}),
  };
  return {
    id,
    name: displayName(kind, value, id),
    status: status(value),
    summary: text(value, 'description', 'summary', 'detail', 'reason', 'errorCode') ?? '',
    ...(sourceRevision !== undefined ? { revision: sourceRevision } : {}),
    updatedAt: observedAt,
    fields,
    tags: [kind, status(value)],
  };
}

export function pageItems(value: unknown) {
  if (!isObject(value) || !Array.isArray(value.items)) throw new Error('Node Control list response must be a Page with an items array');
  return {
    items: value.items,
    nextPageToken: typeof value.nextPageToken === 'string' ? value.nextPageToken : undefined,
    asOf: typeof value.asOf === 'string' ? value.asOf : undefined,
    totalEstimate: typeof value.totalEstimate === 'number' ? value.totalEstimate : undefined,
  };
}
