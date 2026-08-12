import { describe, expect, it, vi } from 'vitest';
import type { NodeEventEnvelope } from '../api/generated/contract';
import {
  LiveNodeEventStream,
  liveEventStreamUrl,
  type LiveEventSource,
  type LiveEventStreamState,
} from '../gateways/liveEventStream';

class FakeEventSource implements LiveEventSource {
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readonly listeners = new Map<string, (event: MessageEvent<string>) => void>();
  closed = false;

  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void {
    this.listeners.set(type, listener);
  }

  close(): void {
    this.closed = true;
  }

  open(): void {
    this.onopen?.(new Event('open'));
  }

  fail(): void {
    this.onerror?.(new Event('error'));
  }

  emit(event: NodeEventEnvelope): void {
    this.listeners.get(event.eventType)?.(new MessageEvent(event.eventType, {
      data: JSON.stringify(event),
      lastEventId: event.eventId,
    }));
  }
}

const event: NodeEventEnvelope = {
  eventId: 'event-p05-1',
  eventType: 'node.configuration.revision_published',
  occurredAt: '2026-08-12T05:00:00.000Z',
  recordedAt: '2026-08-12T05:00:00.100Z',
  nodeId: 'node-live',
  aggregateType: 'configuration_revision',
  aggregateId: 'configuration-p05',
  aggregateRevision: 1,
  correlationId: 'correlation-p05',
  dataClassification: 'internal',
  payload: { status: 'published' },
};

describe('live Node Event stream', () => {
  it('accepts each durable event once and reports the in-memory cursor', () => {
    const sources: FakeEventSource[] = [];
    const received: NodeEventEnvelope[] = [];
    const states: LiveEventStreamState[] = [];
    const stream = new LiveNodeEventStream({
      factory: () => {
        const source = new FakeEventSource();
        sources.push(source);
        return source;
      },
      onEvent: (item) => received.push(item),
      onState: (state) => states.push(state),
    });

    sources[0].open();
    sources[0].emit(event);
    sources[0].emit(event);

    expect(received).toEqual([event]);
    expect(states.at(-1)).toEqual({ status: 'connected', reconnectAttempts: 0, lastEventId: event.eventId });
    stream.stop();
  });

  it('reconnects with Last-Event-ID represented only as the same-origin cursor query', () => {
    vi.useFakeTimers();
    try {
      const urls: string[] = [];
      const sources: FakeEventSource[] = [];
      const stream = new LiveNodeEventStream({
        factory: (url) => {
          urls.push(url);
          const source = new FakeEventSource();
          sources.push(source);
          return source;
        },
        onEvent: () => undefined,
        onState: () => undefined,
        reconnectDelayMs: 10,
      });
      sources[0].open();
      sources[0].emit(event);
      sources[0].fail();
      vi.advanceTimersByTime(10);

      expect(urls).toEqual([
        '/bff/node-control/api/v1/events',
        `/bff/node-control/api/v1/events?lastEventId=${event.eventId}`,
      ]);
      expect(sources[0].closed).toBe(true);
      stream.stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores malformed or mismatched event frames', () => {
    const source = new FakeEventSource();
    const received = vi.fn();
    const stream = new LiveNodeEventStream({ factory: () => source, onEvent: received, onState: () => undefined });
    source.listeners.get(event.eventType)?.(new MessageEvent(event.eventType, { data: '{', lastEventId: event.eventId }));
    source.listeners.get(event.eventType)?.(new MessageEvent(event.eventType, { data: JSON.stringify(event), lastEventId: 'other' }));
    expect(received).not.toHaveBeenCalled();
    stream.stop();
  });

  it('encodes a cursor without exposing upstream authority', () => {
    expect(liveEventStreamUrl('event:with spaces')).toBe('/bff/node-control/api/v1/events?lastEventId=event%3Awith+spaces');
  });
});
