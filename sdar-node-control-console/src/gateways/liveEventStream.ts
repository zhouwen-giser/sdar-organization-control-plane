import type { NodeEventEnvelope } from '../api/generated/contract';

export const NODE_EVENT_TYPES = [
  'node.profile.changed',
  'node.health.changed',
  'node.configuration.revision_published',
  'node.configuration.revision_applied',
  'node.configuration.revision_rejected',
  'node.llm.provider_changed',
  'node.smpp.source_changed',
  'node.mcp.provider_binding_changed',
  'node.skill.version_changed',
  'node.plan_template.version_changed',
  'node.capability.version_published',
  'node.capability.version_suspended',
  'node.capability.version_deprecated',
  'node.capability.version_retired',
  'node.capability.readiness_changed',
  'node.a2a.exposure_changed',
  'node.agent_card.activated',
  'node.task.capability_bound',
  'node.management_operation.completed',
  'node.telemetry_export.status_changed',
] as const;

export type LiveEventStreamStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface LiveEventSource {
  onopen: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void;
  close(): void;
}

export type LiveEventSourceFactory = (url: string) => LiveEventSource;

export interface LiveEventStreamState {
  status: LiveEventStreamStatus;
  reconnectAttempts: number;
  lastEventId?: string;
}

interface LiveNodeEventStreamOptions {
  factory: LiveEventSourceFactory;
  onEvent(event: NodeEventEnvelope): void;
  onState(state: LiveEventStreamState): void;
  reconnectDelayMs?: number;
}

const STREAM_PATH = '/bff/node-control/api/v1/events';

export function liveEventStreamUrl(lastEventId?: string): string {
  if (!lastEventId) return STREAM_PATH;
  const query = new URLSearchParams({ lastEventId });
  return `${STREAM_PATH}?${query.toString()}`;
}

export class LiveNodeEventStream {
  private source?: LiveEventSource;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private stopped = false;
  private reconnectAttempts = 0;
  private lastEventId?: string;
  private readonly seen = new Set<string>();

  constructor(private readonly options: LiveNodeEventStreamOptions) {
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer !== undefined) clearTimeout(this.reconnectTimer);
    this.source?.close();
    this.source = undefined;
    this.emitState('disconnected');
  }

  private connect(): void {
    if (this.stopped) return;
    this.emitState(this.reconnectAttempts === 0 ? 'connecting' : 'reconnecting');
    const source = this.options.factory(liveEventStreamUrl(this.lastEventId));
    this.source = source;
    source.onopen = () => {
      if (this.source !== source || this.stopped) return;
      this.reconnectAttempts = 0;
      this.emitState('connected');
    };
    source.onerror = () => {
      if (this.source !== source || this.stopped) return;
      source.close();
      this.source = undefined;
      this.reconnectAttempts += 1;
      this.emitState('reconnecting');
      const delay = Math.min((this.options.reconnectDelayMs ?? 250) * (2 ** (this.reconnectAttempts - 1)), 5_000);
      this.reconnectTimer = setTimeout(() => this.connect(), delay);
    };
    for (const eventType of NODE_EVENT_TYPES) {
      source.addEventListener(eventType, (message) => this.receive(message, eventType));
    }
  }

  private receive(message: MessageEvent<string>, expectedType: string): void {
    const parsed = parseNodeEvent(message.data);
    if (!parsed || parsed.eventType !== expectedType || parsed.eventId !== message.lastEventId) return;
    this.lastEventId = parsed.eventId;
    if (this.seen.has(parsed.eventId)) {
      this.emitState('connected');
      return;
    }
    this.seen.add(parsed.eventId);
    if (this.seen.size > 512) this.seen.delete(this.seen.values().next().value!);
    this.emitState('connected');
    this.options.onEvent(parsed);
  }

  private emitState(status: LiveEventStreamStatus): void {
    this.options.onState({
      status,
      reconnectAttempts: this.reconnectAttempts,
      ...(this.lastEventId ? { lastEventId: this.lastEventId } : {}),
    });
  }
}

function parseNodeEvent(data: string): NodeEventEnvelope | undefined {
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    return undefined;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const event = value as Record<string, unknown>;
  if (
    typeof event.eventId !== 'string'
    || typeof event.eventType !== 'string'
    || typeof event.occurredAt !== 'string'
    || typeof event.nodeId !== 'string'
    || typeof event.aggregateType !== 'string'
    || typeof event.aggregateId !== 'string'
    || !Number.isSafeInteger(event.aggregateRevision)
    || typeof event.correlationId !== 'string'
    || !event.payload
    || typeof event.payload !== 'object'
    || Array.isArray(event.payload)
  ) return undefined;
  return value as NodeEventEnvelope;
}
