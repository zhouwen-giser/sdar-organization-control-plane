import { describe, expect, it, vi } from 'vitest';
import type { RecordKind } from '../domain';
import { HttpNodeControlGateway, NodeControlHttpClient } from '../gateways/HttpNodeControlGateway';
import { mapLiveResource } from '../gateways/liveResourceMap';

describe('live Node Control resource mapping', () => {
  it.each<[RecordKind, Record<string, unknown>, string]>([
    ['configuration', { configurationId: 'runtime', revision: 12, status: 'applied' }, 'runtime'],
    ['llmProvider', { providerId: 'provider-1', revision: 2, status: 'active' }, 'provider-1'],
    ['modelRoute', { routeId: 'route-1', revision: 3, status: 'active' }, 'route-1'],
    ['smppSource', { smppSourceId: 'source-1', revision: 4, status: 'active' }, 'source-1'],
    ['mcpBinding', { bindingId: 'binding-1', revision: 5, status: 'active' }, 'binding-1'],
    ['skill', { skillId: 'skill-1', version: '1.2.0', status: 'published' }, 'skill-1@1.2.0'],
    ['planTemplate', { artifactId: 'plan-1', version: '3.0.0', status: 'active' }, 'plan-1@3.0.0'],
    ['capability', { capabilityId: 'cap-1', version: 6, status: 'published' }, 'cap-1@6'],
    ['readiness', { capabilityId: 'cap-1', capabilityVersion: 6, snapshotVersion: 9, status: 'available' }, 'cap-1@6'],
    ['a2aExposure', { exposureId: 'exposure-1', version: 2, status: 'published' }, 'exposure-1@2'],
    ['agentCard', { revision: 8, status: 'active' }, '8'],
    ['task', { taskId: 'task-1', phase: 'working' }, 'task-1'],
    ['operation', { operationId: 'operation-1', status: 'running' }, 'operation-1'],
    ['audit', { eventId: 'audit-1', result: 'success' }, 'audit-1'],
  ])('maps %s identity without synthetic values', (kind, dto, expectedId) => {
    const mapped = mapLiveResource(kind, dto, { etag: '"etag-1"' }, '2026-08-12T00:00:00.000Z');
    expect(mapped.id).toBe(expectedId);
    expect(mapped.updatedAt).toBe('');
    expect(mapped.fields.__metadata).toEqual(expect.objectContaining({ etag: '"etag-1"', asOf: '2026-08-12T00:00:00.000Z' }));
  });

  it('reads every page, preserves metadata and filters only after authoritative retrieval', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('pageToken=next-1')) {
        return new Response(JSON.stringify({ items: [{ capabilityId: 'cap-b', version: 2, name: 'Beta', status: 'draft', createdAt: '2026-08-12T00:02:00.000Z' }], asOf: '2026-08-12T00:03:00.000Z' }), { status: 200, headers: { 'content-type': 'application/json', etag: '"page-2"' } });
      }
      return new Response(JSON.stringify({ items: [{ capabilityId: 'cap-a', version: 1, name: 'Alpha', status: 'published', createdAt: '2026-08-12T00:01:00.000Z' }], nextPageToken: 'next-1', asOf: '2026-08-12T00:03:00.000Z' }), { status: 200, headers: { 'content-type': 'application/json', etag: '"page-1"' } });
    });
    const gateway = new HttpNodeControlGateway(new NodeControlHttpClient(fetchImpl as typeof fetch), { autoRefresh: false });
    const published = await gateway.list('capability', { status: 'published' });
    expect(published.map((item) => item.id)).toEqual(['cap-a@1']);
    expect(gateway.getSnapshot().records.capability.map((item) => item.id)).toEqual(['cap-a@1', 'cap-b@2']);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(gateway.getSnapshot().records.capability[1].fields.__metadata).toEqual(expect.objectContaining({ etag: '"page-2"', sourceRevision: 2 }));
  });

  it('maps 404 to an empty detail while retaining other Problem Details', async () => {
    const notFound = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify({ status: 404, code: 'NOT_FOUND', title: 'Not found', correlationId: 'corr-404' }), { status: 404, headers: { 'content-type': 'application/problem+json' } }));
    const gateway = new HttpNodeControlGateway(new NodeControlHttpClient(notFound as typeof fetch), { autoRefresh: false });
    await expect(gateway.get('llmProvider', 'missing')).resolves.toBeUndefined();

    const forbidden = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify({ status: 403, code: 'SCOPE_REQUIRED', title: 'Forbidden', correlationId: 'corr-403' }), { status: 403, headers: { 'content-type': 'application/problem+json' } }));
    const denied = new HttpNodeControlGateway(new NodeControlHttpClient(forbidden as typeof fetch), { autoRefresh: false });
    await expect(denied.list('audit')).rejects.toEqual(expect.objectContaining({ status: 403, code: 'SCOPE_REQUIRED', correlationId: 'corr-403' }));
  });
});
