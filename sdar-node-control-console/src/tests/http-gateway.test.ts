import { describe, expect, it, vi } from 'vitest';
import { CONTRACT_OPERATIONS } from '../api/generated/contract';
import { createNodeControlGateway } from '../gateways/factory';
import { HttpNodeControlGateway, NodeControlHttpClient } from '../gateways/HttpNodeControlGateway';
import { MockNodeControlGateway } from '../gateways/MockNodeControlGateway';
import type { NodeControlGateway } from '../gateways/contracts';

describe('Node Control HTTP gateway', () => {
  it('uses only the same-origin BFF and preserves command metadata', async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ items: [], nextPageToken: 'page-2' }), {
      status: 200,
      headers: { 'content-type': 'application/json', etag: '"r12"', 'x-request-id': 'req-12', 'x-correlation-id': 'corr-12' },
    }));
    const client = new NodeControlHttpClient(fetchImpl as typeof fetch);
    const result = await client.request<{ items: unknown[]; nextPageToken: string }>({
      method: 'POST', path: '/api/v1/evidence-export/replays', query: { pageToken: 'page-1' },
      body: { fromSequence: '90071992547409931234' }, etag: '"r11"', idempotencyKey: 'replay-1', correlationId: 'corr-browser',
    });

    expect(result).toEqual(expect.objectContaining({ status: 200, etag: '"r12"', nextPageToken: 'page-2', requestId: 'req-12', correlationId: 'corr-12' }));
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('/bff/node-control/api/v1/evidence-export/replays?pageToken=page-1');
    const headers = init?.headers as Headers;
    expect(headers.get('if-match')).toBe('"r11"');
    expect(headers.get('idempotency-key')).toBe('replay-1');
    expect(headers.get('authorization')).toBeNull();
    expect(init?.redirect).toBe('manual');
    expect(init?.credentials).toBe('same-origin');
  });

  it('maps application/problem+json without guessing away backend fields', async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      type: 'about:blank', status: 412, code: 'REVISION_PRECONDITION_FAILED', title: 'Revision conflict', detail: 'Refresh first.', correlationId: 'corr-412', retryable: false,
    }), { status: 412, headers: { 'content-type': 'application/problem+json', 'retry-after': '0' } }));
    const client = new NodeControlHttpClient(fetchImpl as typeof fetch);
    await expect(client.request({ method: 'POST', path: '/api/v1/node/draft/publish' })).rejects.toEqual(expect.objectContaining({
      status: 412, code: 'REVISION_PRECONDITION_FAILED', title: 'Revision conflict', detail: 'Refresh first.', correlationId: 'corr-412', retryable: false,
    }));
  });

  it('rejects browser-selected upstream paths before fetch', async () => {
    const fetchImpl = vi.fn();
    const client = new NodeControlHttpClient(fetchImpl as typeof fetch);
    await expect(client.request({ method: 'GET', path: '//attacker.invalid/api/v1/node' })).rejects.toEqual(expect.objectContaining({ code: 'CONSOLE_GATEWAY_PATH_INVALID' }));
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('never instantiates Mock in live mode', () => {
    const live = {} as NodeControlGateway;
    const mock = {} as NodeControlGateway;
    const factories = { http: vi.fn(() => live), mock: vi.fn(() => mock) };
    expect(createNodeControlGateway({ gatewayMode: 'live', activeDeploymentRole: 'node_admin', securityClassification: 'LOOPBACK_SERVER_CREDENTIAL' }, factories)).toBe(live);
    expect(factories.http).toHaveBeenCalledOnce();
    expect(factories.mock).not.toHaveBeenCalled();
    expect(new HttpNodeControlGateway()).not.toBeInstanceOf(MockNodeControlGateway);
  });

  it('acquires the current resource ETag before a Configuration transition', async () => {
    const revision = { configurationId: 'console-p04', targetType: 'runtime_policy', targetId: 'probe', revision: 1, status: 'draft', applyMode: 'new_task_only', content: {}, checksum: 'a'.repeat(64), createdBy: 'test', createdAt: '2026-08-12T00:00:00.000Z' };
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(revision), { status: 200, headers: { 'content-type': 'application/json', etag: '"draft-1"' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...revision, status: 'validated' }), { status: 200, headers: { 'content-type': 'application/json', etag: '"validated-1"' } }));
    const gateway = new HttpNodeControlGateway(new NodeControlHttpClient(fetchImpl as typeof fetch), { autoRefresh: false });

    const receipt = await gateway.execute({
      operation: requiredOperation('validateConfigurationRevision'), target: { type: 'configuration', id: 'console-p04@1', revision: 1 },
      reason: 'Validate the P04 probe.', expectedRevision: 1, idempotencyKey: 'p04-validate-1',
    });

    expect(receipt.mode).toBe('synchronous');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0][0]).toBe('/bff/node-control/api/v1/configuration-revisions/console-p04/1');
    expect(fetchImpl.mock.calls[1][0]).toBe('/bff/node-control/api/v1/configuration-revisions/console-p04/1/validate');
    const init = fetchImpl.mock.calls[1][1] as RequestInit;
    expect((init.headers as Headers).get('if-match')).toBe('"draft-1"');
    expect((init.headers as Headers).get('idempotency-key')).toBe('p04-validate-1');
    expect(JSON.parse(String(init.body))).toEqual({ reason: 'Validate the P04 probe.', expectedRevision: 1 });
  });

  it('preserves a displayed stale ETag and surfaces the authoritative 412 conflict', async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      type: 'about:blank', status: 412, code: 'REVISION_PRECONDITION_FAILED', title: 'Revision conflict', detail: 'Refresh the resource.', correlationId: 'corr-stale', retryable: false,
    }), { status: 412, headers: { 'content-type': 'application/problem+json' } }));
    const gateway = new HttpNodeControlGateway(new NodeControlHttpClient(fetchImpl as typeof fetch), { autoRefresh: false });
    await expect(gateway.execute({
      operation: requiredOperation('validateConfigurationRevision'), target: { type: 'configuration', id: 'console-p04@1', revision: 1, etag: '"stale"' },
      reason: 'Validate using the displayed revision.', expectedRevision: 1, idempotencyKey: 'p04-stale-1',
    })).rejects.toEqual(expect.objectContaining({ status: 412, code: 'REVISION_PRECONDITION_FAILED', correlationId: 'corr-stale' }));
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect((fetchImpl.mock.calls[0][1]?.headers as Headers).get('if-match')).toBe('"stale"');
  });

  it('returns 202 as an accepted Management Operation, never as applied', async () => {
    const operation = { operationId: 'operation-p04', operationType: 'configuration_publish', target: { type: 'configuration', id: 'console-p04', revision: 1 }, status: 'accepted', actorId: 'console-test', reason: 'Publish the P04 probe.', createdAt: '2026-08-12T00:01:00.000Z' } as const;
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(operation), { status: 202, headers: { 'content-type': 'application/json' } }));
    const gateway = new HttpNodeControlGateway(new NodeControlHttpClient(fetchImpl as typeof fetch), { autoRefresh: false });
    const receipt = await gateway.execute({
      operation: requiredOperation('publishConfigurationRevision'), target: { type: 'configuration', id: 'console-p04@1', revision: 1, etag: '"validated-1"' },
      reason: operation.reason, expectedRevision: 1, idempotencyKey: 'p04-publish-1',
    });
    expect(receipt).toMatchObject({ mode: 'operation', operation: { operationId: 'operation-p04', status: 'accepted' } });
    expect(gateway.getSnapshot().records.operation[0]).toMatchObject({ id: 'operation-p04', status: 'accepted' });
    expect(gateway.getSnapshot().records.configuration).toHaveLength(0);
  });

  it.each([
    [409, 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_INPUT', false],
    [422, 'CONFIGURATION_REVISION_INVALID', false],
    [429, 'RATE_LIMITED', true],
    [503, 'NODE_CONTROL_UNAVAILABLE', true],
  ])('preserves command failure %i/%s', async (status, code, retryable) => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ type: 'about:blank', status, code, title: code, detail: code, correlationId: `corr-${status}`, retryable }), {
      status, headers: { 'content-type': 'application/problem+json', ...(status === 429 ? { 'retry-after': '2' } : {}) },
    }));
    const client = new NodeControlHttpClient(fetchImpl as typeof fetch);
    await expect(client.request({ method: 'POST', path: '/api/v1/configuration-revisions', body: {}, idempotencyKey: 'same-key' }))
      .rejects.toEqual(expect.objectContaining({ status, code, retryable, correlationId: `corr-${status}` }));
  });
});

function requiredOperation(operationId: string) {
  const operation = CONTRACT_OPERATIONS.find((item) => item.operationId === operationId);
  if (!operation) throw new Error(`Missing operation ${operationId}`);
  return operation;
}
