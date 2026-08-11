import { describe, expect, it, vi } from 'vitest';
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
});
