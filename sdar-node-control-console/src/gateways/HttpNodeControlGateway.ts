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
  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async request<T>(input: NodeControlRequest): Promise<NodeControlResponse<T>> {
    const headers = new Headers({ accept: 'application/json' });
    if (input.body !== undefined) headers.set('content-type', 'application/json');
    if (input.etag) headers.set('if-match', input.etag);
    if (input.idempotencyKey) headers.set('idempotency-key', input.idempotencyKey);
    if (input.lastEventId) headers.set('last-event-id', input.lastEventId);
    if (input.requestId) headers.set('x-request-id', input.requestId);
    if (input.correlationId) headers.set('x-correlation-id', input.correlationId);
    const response = await this.fetchImpl(requestPath(input.path, input.query), {
      method: input.method,
      headers,
      body: input.body === undefined ? undefined : JSON.stringify(input.body),
      redirect: 'manual',
      credentials: 'same-origin',
    });
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

function mappingPending() {
  return new ConsoleError({
    status: 501,
    code: 'CONSOLE_LIVE_RESOURCE_MAPPING_PENDING',
    title: 'Live resource mapping is not ready',
    detail: 'The live transport is active, but this Console resource has not yet been mapped to its frozen Node Control operation.',
    correlationId: 'console-local',
    retryable: false,
  });
}

export class HttpNodeControlGateway implements NodeControlGateway {
  private readonly snapshot = emptyLiveSnapshot();

  constructor(readonly client = new NodeControlHttpClient()) {}

  getSnapshot() { return this.snapshot; }
  subscribe() { return () => undefined; }
  setScenario(_scenario: ScenarioId) {}
  reset() {}
  operationById(operationId: string): ContractOperation | undefined {
    return CONTRACT_OPERATIONS.find((operation) => operation.operationId === operationId);
  }
  list(_kind: RecordKind, _options?: QueryOptions): Promise<ConsoleRecord[]> { return Promise.reject(mappingPending()); }
  get(_kind: RecordKind, _id: string): Promise<ConsoleRecord | undefined> { return Promise.reject(mappingPending()); }
  execute(_input: CommandInput): Promise<CommandReceipt> { return Promise.reject(mappingPending()); }
}
