import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = new URL(process.env.CONSOLE_SMOKE_BASE_URL ?? 'http://127.0.0.1:4188');
const reportPath = path.resolve('reports/single-node-live-integration/p05-live-sse-smoke.json');

const initial = await readEvents('/bff/node-control/api/v1/events', 2);
const cursor = initial.events[0].eventId;
const replay = await readEvents(`/bff/node-control/api/v1/events?lastEventId=${encodeURIComponent(cursor)}`, 1);
if (replay.events[0].eventId !== initial.events[1].eventId) {
  throw new Error('SSE reconnect did not resume from the exact durable cursor.');
}

const authoritativePath = authoritativePathFor(replay.events[0].eventType);
const authoritative = await fetch(new URL(`/bff/node-control${authoritativePath}`, baseUrl), { redirect: 'manual' });
if (!authoritative.ok) throw new Error(`Authoritative refetch failed with HTTP ${authoritative.status}.`);
await authoritative.arrayBuffer();

const result = {
  schemaVersion: 1,
  ok: true,
  observedAt: new Date().toISOString(),
  transport: 'text/event-stream',
  initialStatus: initial.status,
  cacheControl: initial.cacheControl,
  bufferingDisabled: initial.bufferingDisabled,
  initialEventCount: initial.events.length,
  reconnectEventCount: replay.events.length,
  cursorSha256: sha256(cursor),
  resumedEventSha256: sha256(replay.events[0].eventId),
  resumedEventType: replay.events[0].eventType,
  aggregateType: replay.events[0].aggregateType,
  aggregateRevision: replay.events[0].aggregateRevision,
  authoritativeRefetchPath: authoritativePath,
  authoritativeRefetchStatus: authoritative.status,
  eventPayloadUsedAsResourceState: false,
  browserReceivedUpstreamAuthority: false,
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));

async function readEvents(relativePath, count) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(new URL(relativePath, baseUrl), { signal: controller.signal, redirect: 'manual' });
    if (!response.ok || !response.body) throw new Error(`SSE request failed with HTTP ${response.status}.`);
    if (!(response.headers.get('content-type') ?? '').startsWith('text/event-stream')) throw new Error('SSE content type is missing.');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const events = [];
    while (events.length < count) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const parsed = parseFrame(frame);
        if (parsed) events.push(parsed);
        if (events.length >= count) break;
      }
    }
    await reader.cancel();
    if (events.length !== count) throw new Error(`Expected ${count} SSE events and received ${events.length}.`);
    return {
      status: response.status,
      cacheControl: response.headers.get('cache-control'),
      bufferingDisabled: response.headers.get('x-accel-buffering') === 'no',
      events,
    };
  } finally {
    clearTimeout(timer);
  }
}

function parseFrame(frame) {
  if (frame.startsWith(':')) return undefined;
  const fields = {};
  for (const line of frame.split('\n')) {
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    fields[line.slice(0, separator)] = line.slice(separator + 1).trimStart();
  }
  if (!fields.id || !fields.event || !fields.data) return undefined;
  const event = JSON.parse(fields.data);
  if (event.eventId !== fields.id || event.eventType !== fields.event) throw new Error('SSE frame metadata does not match its NodeEventEnvelope.');
  return event;
}

function authoritativePathFor(eventType) {
  if (eventType.startsWith('node.configuration.')) return '/api/v1/configuration-revisions';
  if (eventType === 'node.llm.provider_changed') return '/api/v1/models/providers';
  if (eventType === 'node.smpp.source_changed') return '/api/v1/smpp-sources';
  if (eventType === 'node.mcp.provider_binding_changed') return '/api/v1/mcp-provider-bindings';
  if (eventType === 'node.skill.version_changed') return '/api/v1/skills';
  if (eventType === 'node.plan_template.version_changed') return '/api/v1/plan-templates';
  if (eventType.startsWith('node.capability.version_')) return '/api/v1/node-capabilities';
  if (eventType === 'node.capability.readiness_changed') return '/api/v1/capability-readiness';
  if (eventType === 'node.a2a.exposure_changed') return '/api/v1/a2a-exposures';
  if (eventType === 'node.agent_card.activated') return '/api/v1/a2a-agent-card-revisions';
  if (eventType === 'node.task.capability_bound') return '/api/v1/tasks';
  if (eventType === 'node.management_operation.completed') return '/api/v1/management-operations';
  return '/api/v1/node/health';
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
