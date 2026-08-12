import { CONTRACT_OPERATIONS, type ContractOperation } from '../api/generated/contract';
import type {
  CommandInput,
  CommandReceipt,
  ConsoleRecord,
  GatewaySnapshot,
  QueryOptions,
  RecordKind,
  ScenarioId,
} from '../domain';
import { ConsoleError } from '../domain';
import type { NodeControlGateway } from './contracts';
import { mapLiveCommand } from './liveCommandMap';
import { LIVE_RESOURCES, mapLiveResource, pageItems } from './liveResourceMap';

export interface NodeControlResponse<T> {
  status: number;
  data: T;
  etag?: string;
  retryAfter?: string;
  requestId?: string;
  correlationId?: string;
  nextPageToken?: string;
}

export interface NodeControlRequest {
  method: string;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  etag?: string;
  ifNoneMatch?: string;
  idempotencyKey?: string;
  lastEventId?: string;
  requestId?: string;
  correlationId?: string;
}

const BFF_PREFIX = '/bff/node-control';

function requestPath(path: string, query: NodeControlRequest['query']) {
  if (!path.startsWith('/') || path.startsWith('//') || /%2f|%5c/i.test(path) || path.includes('\\')) {
    throw new ConsoleError({
      status: 400,
      code: 'CONSOLE_GATEWAY_PATH_INVALID',
      title: 'Invalid Node Control path',
      detail: 'The browser gateway accepts only contract-relative Node Control paths.',
      correlationId: 'console-local',
      retryable: false,
    });
  }
  const url = new URL(`${BFF_PREFIX}${path}`, window.location.origin);
  for (const [name, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(name, String(value));
  }
  return `${url.pathname}${url.search}`;
}

function responseMetadata<T>(response: Response, data: T): NodeControlResponse<T> {
  const page = data && typeof data === 'object' && 'nextPageToken' in data
    ? (data as { nextPageToken?: unknown }).nextPageToken
    : undefined;
  return {
    status: response.status,
    data,
    ...(response.headers.get('etag') ? { etag: response.headers.get('etag')! } : {}),
    ...(response.headers.get('retry-after') ? { retryAfter: response.headers.get('retry-after')! } : {}),
    ...(response.headers.get('x-request-id') ? { requestId: response.headers.get('x-request-id')! } : {}),
    ...(response.headers.get('x-correlation-id') ? { correlationId: response.headers.get('x-correlation-id')! } : {}),
    ...(typeof page === 'string' ? { nextPageToken: page } : {}),
  };
}

async function responseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('json')) return response.json();
  return response.text();
}

function toConsoleError(response: Response, body: unknown): ConsoleError {
  const problem = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const correlationId = typeof problem.correlationId === 'string'
    ? problem.correlationId
    : response.headers.get('x-correlation-id') ?? response.headers.get('x-request-id') ?? 'unknown';
  return new ConsoleError({
    status: response.status,
    code: typeof problem.code === 'string' ? problem.code : 'NODE_CONTROL_REQUEST_FAILED',
    title: typeof problem.title === 'string' ? problem.title : `Node Control request failed (${response.status})`,
    detail: typeof problem.detail === 'string' ? problem.detail : 'The Node Control request did not complete successfully.',
    correlationId,
    retryable: typeof problem.retryable === 'boolean' ? problem.retryable : response.status === 429 || response.status >= 500,
  });
}

export class NodeControlHttpClient {
  constructor(private readonly fetchImpl: typeof fetch = (input, init) => globalThis.fetch(input, init)) {}

  async request<T>(input: NodeControlRequest): Promise<NodeControlResponse<T>> {
    const headers = new Headers({ accept: 'application/json' });
    if (input.body !== undefined) headers.set('content-type', 'application/json');
    if (input.etag) headers.set('if-match', input.etag);
    if (input.ifNoneMatch) headers.set('if-none-match', input.ifNoneMatch);
    if (input.idempotencyKey) headers.set('idempotency-key', input.idempotencyKey);
    if (input.lastEventId) headers.set('last-event-id', input.lastEventId);
    if (input.requestId) headers.set('x-request-id', input.requestId);
    if (input.correlationId) headers.set('x-correlation-id', input.correlationId);
    let response: Response;
    try {
      response = await this.fetchImpl(requestPath(input.path, input.query), {
        method: input.method,
        headers,
        body: input.body === undefined ? undefined : JSON.stringify(input.body),
        redirect: 'manual',
        credentials: 'same-origin',
      });
    } catch (error) {
      if (error instanceof ConsoleError) throw error;
      throw new ConsoleError({
        status: 503,
        code: 'CONSOLE_BFF_UNAVAILABLE',
        title: 'Console BFF unavailable',
        detail: error instanceof Error ? error.message : 'The same-origin Console BFF could not be reached.',
        correlationId: 'console-local',
        retryable: true,
      });
    }
    if (response.status === 304) return responseMetadata(response, undefined as T);
    const body = await responseBody(response);
    if (!response.ok) throw toConsoleError(response, body);
    return responseMetadata(response, body as T);
  }
}

function emptyLiveSnapshot(): GatewaySnapshot {
  const observedAt = new Date(0).toISOString();
  const records = {
    configuration: [], llmProvider: [], modelRoute: [], smppSource: [], mcpCandidate: [], mcpBinding: [], skill: [],
    planTemplate: [], capability: [], readiness: [], a2aExposure: [], agentCard: [], task: [], operation: [], audit: [], event: [],
  } satisfies Record<RecordKind, ConsoleRecord[]>;
  return {
    revision: 0,
    node: {
      profile: { id: 'live-node-loading', name: 'Live Node Control', status: 'unavailable', summary: 'Awaiting authoritative Node Control data.', updatedAt: observedAt, fields: {} },
      health: { status: 'unavailable', observedAt, activeTasks: 0, components: [] },
      declaration: {},
    },
    evidence: {
      configuration: { id: 'live-evidence-loading', name: 'Evidence Export', status: 'unavailable', summary: 'Awaiting authoritative Node Control data.', updatedAt: observedAt, fields: {} },
      status: { status: 'unavailable', pendingRecords: 0, deadLetterRecords: 0, openProjectionIssues: 0, openQualityIssues: 0, highWatermarkActive: false, observedAt },
    },
    records,
    nodeEvents: [],
  };
}

export class HttpNodeControlGateway implements NodeControlGateway {
  private snapshot = emptyLiveSnapshot();
  private readonly listeners = new Set<() => void>();

  constructor(readonly client = new NodeControlHttpClient(), options: { autoRefresh?: boolean } = {}) {
    if (options.autoRefresh !== false) void this.refreshSnapshot().catch(() => undefined);
  }

  getSnapshot() { return this.snapshot; }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  setScenario(_scenario: ScenarioId) {}
  reset() { void this.refreshSnapshot().catch(() => undefined); }
  async refreshOverview() {
    const kinds: RecordKind[] = ['configuration', 'mcpBinding', 'capability', 'readiness', 'task', 'operation', 'audit'];
    for (const kind of kinds) {
      try { await this.list(kind); } catch { /* Individual page hooks surface their authoritative errors. */ }
    }
  }
  operationById(operationId: string): ContractOperation | undefined {
    return CONTRACT_OPERATIONS.find((operation) => operation.operationId === operationId);
  }
  async list(kind: RecordKind, options: QueryOptions = {}): Promise<ConsoleRecord[]> {
    if (kind === 'event') return this.snapshot.records.event;
    const definition = LIVE_RESOURCES[kind];
    const records: ConsoleRecord[] = [];
    let pageToken: string | undefined;
    let pages = 0;
    do {
      const response = await this.client.request<unknown>({ method: 'GET', path: definition.listPath, query: pageToken ? { pageToken } : undefined });
      const page = pageItems(response.data);
      records.push(...page.items.map((item) => mapLiveResource(kind, item, response, page.asOf)));
      pageToken = page.nextPageToken;
      pages += 1;
      if (pages > 100) throw new ConsoleError({ status: 502, code: 'CONSOLE_PAGINATION_LIMIT_EXCEEDED', title: 'Pagination limit exceeded', detail: 'Node Control returned more than 100 pages for one Console query.', correlationId: response.correlationId ?? 'unknown', retryable: false });
    } while (pageToken);
    const filtered = records.filter((record) => {
      const searchMatches = !options.search || `${record.id} ${record.name} ${record.summary} ${(record.tags ?? []).join(' ')}`.toLowerCase().includes(options.search.toLowerCase());
      const statusMatches = !options.status || options.status === 'all' || record.status === options.status;
      return searchMatches && statusMatches;
    });
    this.replaceRecords(kind, records);
    return filtered;
  }
  async get(kind: RecordKind, id: string): Promise<ConsoleRecord | undefined> {
    const definition = LIVE_RESOURCES[kind];
    if (!definition.detailPath) return (await this.list(kind)).find((record) => record.id === id);
    try {
      const response = await this.client.request<unknown>({ method: 'GET', path: definition.detailPath(id) });
      let source = response.data;
      if (source && typeof source === 'object' && !Array.isArray(source) && kind === 'task') {
        try {
          const binding = await this.client.request<unknown>({ method: 'GET', path: `/api/v1/tasks/${encodeURIComponent(id)}/capability-binding` });
          source = { ...source as Record<string, unknown>, capabilityBinding: binding.data };
        } catch (error) {
          if (!(error instanceof ConsoleError && error.status === 404)) throw error;
        }
      }
      if (source && typeof source === 'object' && !Array.isArray(source) && kind === 'capability') {
        const [capabilityId, version] = id.split('@');
        const implementations = await this.client.request<unknown>({ method: 'GET', path: `/api/v1/node-capabilities/${encodeURIComponent(capabilityId)}/versions/${encodeURIComponent(version)}/implementations` });
        source = { ...source as Record<string, unknown>, implementationBindings: pageItems(implementations.data).items };
      }
      const record = mapLiveResource(kind, source, response);
      this.upsertRecord(kind, record);
      return record;
    } catch (error) {
      if (error instanceof ConsoleError && error.status === 404) return undefined;
      throw error;
    }
  }
  async execute(input: CommandInput): Promise<CommandReceipt> {
    const mapping = await mapLiveCommand(input);
    let etag = input.target.etag;
    if (!etag && mapping.currentResourcePath) {
      const current = await this.client.request<unknown>({ method: 'GET', path: mapping.currentResourcePath });
      etag = current.etag;
      if (!etag) {
        throw new ConsoleError({
          status: 502,
          code: 'CONSOLE_CURRENT_ETAG_MISSING',
          title: 'Current resource ETag is missing',
          detail: 'The authoritative resource did not return an ETag required for optimistic concurrency.',
          correlationId: current.correlationId ?? 'unknown',
          retryable: true,
        });
      }
    }
    const response = await this.client.request<unknown>({
      method: mapping.method,
      path: mapping.path,
      body: mapping.body,
      ...(etag ? { etag } : {}),
      idempotencyKey: input.idempotencyKey,
    });
    const acceptedAt = new Date().toISOString();
    if (mapping.responseKind === 'operation') {
      const operation = response.data as CommandReceipt['operation'];
      if (!operation || typeof operation.operationId !== 'string') {
        throw new ConsoleError({
          status: 502,
          code: 'CONSOLE_OPERATION_RESPONSE_INVALID',
          title: 'Management Operation response is invalid',
          detail: 'A command mapped as asynchronous did not return a ManagementOperation.',
          correlationId: response.correlationId ?? 'unknown',
          retryable: false,
        });
      }
      this.upsertRecord('operation', mapLiveResource('operation', operation, response));
      return { mode: 'operation', acceptedAt: operation.createdAt, operation };
    }
    if (mapping.responseKind === 'configuration') {
      const record = mapLiveResource('configuration', response.data, response);
      this.upsertRecord('configuration', record);
      return { mode: 'synchronous', acceptedAt, record };
    }
    return { mode: 'synchronous', acceptedAt };
  }

  private emit() { this.listeners.forEach((listener) => listener()); }

  private replaceRecords(kind: RecordKind, records: ConsoleRecord[]) {
    if (JSON.stringify(this.snapshot.records[kind]) === JSON.stringify(records)) return;
    this.snapshot = { ...this.snapshot, revision: this.snapshot.revision + 1, records: { ...this.snapshot.records, [kind]: records } };
    this.emit();
  }

  private upsertRecord(kind: RecordKind, record: ConsoleRecord) {
    const records = this.snapshot.records[kind].filter((item) => item.id !== record.id);
    this.replaceRecords(kind, [record, ...records]);
  }

  private async refreshSnapshot() {
    const profileRequest = this.client.request<Record<string, unknown>>({ method: 'GET', path: '/api/v1/node' });
    const healthRequest = this.client.request<Record<string, unknown>>({ method: 'GET', path: '/api/v1/node/health' });
    const declarationRequest = this.client.request<Record<string, unknown>>({ method: 'GET', path: '/.well-known/sdar-node' });
    const evidenceConfigurationRequest = this.client.request<Record<string, unknown>>({ method: 'GET', path: '/api/v1/evidence-export' });
    const evidenceStatusRequest = this.client.request<Record<string, unknown>>({ method: 'GET', path: '/api/v1/evidence-export/status' });
    const [profileResult, healthResult, declarationResult, evidenceConfigurationResult, evidenceStatusResult] = await Promise.allSettled([
      profileRequest, healthRequest, declarationRequest, evidenceConfigurationRequest, evidenceStatusRequest,
    ]);
    if (profileResult.status === 'rejected') throw profileResult.reason;
    if (healthResult.status === 'rejected') throw healthResult.reason;
    if (declarationResult.status === 'rejected') throw declarationResult.reason;
    const profile = profileResult.value;
    const health = healthResult.value;
    const declaration = declarationResult.value;
    const evidenceConfiguration = evidenceConfigurationResult.status === 'fulfilled' ? evidenceConfigurationResult.value : undefined;
    const evidenceStatus = evidenceStatusResult.status === 'fulfilled' ? evidenceStatusResult.value : undefined;
    const profileFields = profile.data;
    const healthFields = health.data;
    const evidenceFields = evidenceConfiguration?.data ?? {};
    const statusFields = evidenceStatus?.data ?? {};
    const observedAt = typeof healthFields.observedAt === 'string' ? healthFields.observedAt : '';
    this.snapshot = {
      ...this.snapshot,
      revision: this.snapshot.revision + 1,
      node: {
        profile: {
          id: typeof profileFields.nodeId === 'string' ? profileFields.nodeId : 'unknown-node',
          name: typeof profileFields.displayName === 'string' ? profileFields.displayName : typeof profileFields.nodeId === 'string' ? profileFields.nodeId : 'Unknown Node',
          status: typeof profileFields.status === 'string' ? profileFields.status : 'unknown',
          summary: typeof profileFields.description === 'string' ? profileFields.description : '',
          ...(typeof profileFields.revision === 'number' ? { revision: profileFields.revision } : {}),
          updatedAt: typeof profileFields.updatedAt === 'string' ? profileFields.updatedAt : '',
          fields: { ...profileFields, __metadata: { ...(profile.etag ? { etag: profile.etag } : {}), sourceRevision: profileFields.revision, observedAt: profileFields.updatedAt } },
        },
        health: {
          status: healthFields.status === 'healthy' || healthFields.status === 'degraded' || healthFields.status === 'unavailable' ? healthFields.status : 'unavailable',
          observedAt,
          activeTasks: typeof healthFields.activeTasks === 'number' ? healthFields.activeTasks : 0,
          components: Array.isArray(healthFields.components) ? healthFields.components.map((component) => {
            const item = component as Record<string, unknown>;
            return { name: String(item.component ?? ''), status: String(item.status ?? 'unknown'), detail: String(item.reasonCode ?? ''), ...(typeof item.latencyMs === 'number' ? { latencyMs: item.latencyMs } : {}) };
          }) : [],
        },
        declaration: declaration.data,
      },
      evidence: {
        configuration: {
          id: typeof evidenceFields.exportId === 'string' ? evidenceFields.exportId : 'evidence-export',
          name: typeof evidenceFields.exportId === 'string' ? evidenceFields.exportId : 'Evidence Export',
          status: typeof evidenceFields.status === 'string' ? evidenceFields.status : typeof statusFields.status === 'string' ? statusFields.status : 'unavailable',
          summary: '',
          ...(typeof evidenceFields.revision === 'number' ? { revision: evidenceFields.revision } : {}),
          updatedAt: '',
          fields: { ...evidenceFields, __metadata: { ...(evidenceConfiguration?.etag ? { etag: evidenceConfiguration.etag } : {}), sourceRevision: evidenceFields.revision } },
        },
        status: {
          status: statusFields.status === 'healthy' || statusFields.status === 'degraded' || statusFields.status === 'blocked' || statusFields.status === 'disabled' || statusFields.status === 'unavailable' ? statusFields.status : 'unavailable',
          ...(typeof statusFields.activeRevision === 'number' ? { activeRevision: statusFields.activeRevision } : {}),
          pendingRecords: typeof statusFields.pendingRecords === 'number' ? statusFields.pendingRecords : 0,
          deadLetterRecords: 0,
          openProjectionIssues: 0,
          openQualityIssues: 0,
          highWatermarkActive: false,
          ...(typeof statusFields.lastAcknowledgedSequence === 'string' ? { lastAcknowledgedSequence: statusFields.lastAcknowledgedSequence } : {}),
          ...(typeof statusFields.lastAcknowledgedAt === 'string' ? { lastAcknowledgedAt: statusFields.lastAcknowledgedAt } : {}),
          ...(typeof statusFields.oldestPendingAt === 'string' ? { oldestPendingAt: statusFields.oldestPendingAt } : {}),
          ...(typeof statusFields.lastErrorCode === 'string' ? { lastErrorCode: statusFields.lastErrorCode } : {}),
          observedAt: typeof statusFields.observedAt === 'string' ? statusFields.observedAt : '',
        },
      },
    };
    this.emit();
  }
}
