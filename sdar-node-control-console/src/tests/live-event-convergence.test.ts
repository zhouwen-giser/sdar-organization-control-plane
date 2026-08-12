import { describe, expect, it, vi } from 'vitest';
import type { NodeEventEnvelope } from '../api/generated/contract';
import { HttpNodeControlGateway, NodeControlHttpClient } from '../gateways/HttpNodeControlGateway';
import type { LiveEventSource } from '../gateways/liveEventStream';

class ControlledEventSource implements LiveEventSource {
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readonly listeners = new Map<string, (event: MessageEvent<string>) => void>();
  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void { this.listeners.set(type, listener); }
  close(): void {}
  emit(event: NodeEventEnvelope): void {
    this.listeners.get(event.eventType)?.(new MessageEvent(event.eventType, { data: JSON.stringify(event), lastEventId: event.eventId }));
  }
}

describe('live Node Event convergence', () => {
  it('stores the hint but obtains Configuration state from an authoritative GET', async () => {
    const requested: string[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      requested.push(path);
      if (path.endsWith('/api/v1/node')) return json({ nodeId: 'node-live', displayName: 'Node Live', status: 'active', revision: 1, updatedAt: '2026-08-12T05:00:00.000Z' });
      if (path.endsWith('/api/v1/node/health')) return json({ status: 'healthy', observedAt: '2026-08-12T05:00:00.000Z', activeTasks: 0, components: [] });
      if (path.endsWith('/.well-known/sdar-node')) return json({ schemaVersion: '1.0.0', nodeId: 'node-live' });
      if (path.endsWith('/api/v1/configuration-revisions')) return json({ items: [], totalEstimate: 0, asOf: '2026-08-12T05:00:01.000Z' });
      return new Response(JSON.stringify({ status: 404, code: 'NOT_FOUND', title: 'Not found' }), { status: 404, headers: { 'content-type': 'application/problem+json' } });
    });
    const source = new ControlledEventSource();
    const gateway = new HttpNodeControlGateway(new NodeControlHttpClient(fetchImpl as typeof fetch), {
      eventSourceFactory: () => source,
    });
    await vi.waitFor(() => expect(requested).toContain('/bff/node-control/api/v1/node/health'));
    source.onopen?.(new Event('open'));
    source.emit({
      eventId: 'event-p05-configuration',
      eventType: 'node.configuration.revision_published',
      occurredAt: '2026-08-12T05:00:01.000Z',
      nodeId: 'node-live',
      aggregateType: 'configuration_revision',
      aggregateId: 'configuration-p05',
      aggregateRevision: 1,
      correlationId: 'correlation-p05',
      payload: { status: 'forged-applied-value-must-not-become-resource-state' },
    });

    await vi.waitFor(() => expect(requested).toContain('/bff/node-control/api/v1/configuration-revisions'));
    expect(gateway.getSnapshot().records.configuration).toEqual([]);
    expect(gateway.getSnapshot().records.event[0]).toMatchObject({
      id: 'event-p05-configuration',
      name: 'node.configuration.revision_published',
    });
    expect(gateway.getSnapshot().eventStream).toEqual({
      status: 'connected',
      reconnectAttempts: 0,
      lastEventId: 'event-p05-configuration',
    });
    gateway.disconnectEventStream();
  });
});

function json(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } });
}
