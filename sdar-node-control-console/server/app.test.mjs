import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createConsoleBffServer } from './app.mjs';

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requests = [];
let upstream;
let bff;
let upstreamBase;
let bffBase;

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

before(async () => {
  upstream = http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    requests.push({ method: request.method, url: request.url, headers: request.headers, body: Buffer.concat(chunks).toString('utf8') });
    const url = new URL(request.url, 'http://upstream.invalid');
    if (url.pathname === '/api/v1/node' && request.method === 'GET') {
      response.writeHead(200, { 'content-type': 'application/json', etag: '"node-r7"', 'x-request-id': 'req-upstream-1', authorization: 'must-not-leak' });
      return response.end(JSON.stringify({ nodeId: 'node-live', revision: 7 }));
    }
    if (url.pathname === '/api/v1/node/draft' && request.method === 'PUT') {
      response.writeHead(200, { 'content-type': 'application/json', etag: '"node-r8"' });
      return response.end(JSON.stringify({ revision: 8 }));
    }
    if (url.pathname === '/api/v1/tasks' && request.method === 'GET') {
      response.writeHead(429, { 'content-type': 'application/problem+json', 'retry-after': '7', 'x-correlation-id': 'corr-rate' });
      return response.end(JSON.stringify({ type: 'about:blank', status: 429, code: 'RATE_LIMITED', title: 'Rate limited', detail: 'Try later.', correlationId: 'corr-rate', retryable: true }));
    }
    if (url.pathname === '/api/v1/node/health' && url.searchParams.get('redirect') === '1') {
      response.writeHead(307, { location: 'http://127.0.0.1:1/credential-sink' });
      return response.end();
    }
    if (url.pathname === '/api/v1/node/health') {
      response.writeHead(503, { 'content-type': 'application/problem+json', 'x-correlation-id': 'corr-health' });
      return response.end(JSON.stringify({ type: 'about:blank', status: 503, code: 'NODE_DEGRADED', title: 'Node degraded', detail: 'Runtime is unavailable.', correlationId: 'corr-health', retryable: true }));
    }
    if (url.pathname === '/api/v1/events') {
      response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'public, max-age=99' });
      return response.end('id: evt-2\nevent: node.changed\ndata: {"aggregateId":"node-live"}\n\n');
    }
    response.writeHead(404, { 'content-type': 'application/problem+json' });
    response.end(JSON.stringify({ status: 404, code: 'UPSTREAM_NOT_FOUND', title: 'Not found' }));
  });
  upstreamBase = await listen(upstream);
  bff = createConsoleBffServer({
    mode: 'live',
    role: 'node_admin',
    host: '127.0.0.1',
    port: 4173,
    loopback: true,
    securityClassification: 'LOOPBACK_SERVER_CREDENTIAL',
    upstreamBaseUrl: new URL(upstreamBase),
    bearerToken: 'server-only-bearer-value',
  }, { contractRoot: path.join(moduleRoot, 'contracts/node-control/v1.0.0') });
  bffBase = await listen(bff);
});

after(async () => {
  await close(bff);
  await close(upstream);
});

test('public config and browser responses never disclose server authority', async () => {
  const configResponse = await fetch(`${bffBase}/console-config`);
  assert.equal(configResponse.status, 200);
  const serialized = await configResponse.text();
  assert.match(serialized, /"gatewayMode":"live"/);
  assert.match(serialized, /"activeDeploymentRole":"node_admin"/);
  assert.doesNotMatch(serialized, /server-only-bearer-value|SDAR_NODE_CONTROL|upstreamBaseUrl|bearerToken/i);

  const nodeResponse = await fetch(`${bffBase}/bff/node-control/api/v1/node?upstream=http://attacker.invalid`, {
    headers: { authorization: 'Bearer browser-controlled' },
  });
  assert.equal(nodeResponse.status, 200);
  assert.equal(nodeResponse.headers.get('etag'), '"node-r7"');
  assert.equal(nodeResponse.headers.get('x-request-id'), 'req-upstream-1');
  assert.equal(nodeResponse.headers.get('authorization'), null);
  assert.deepEqual(await nodeResponse.json(), { nodeId: 'node-live', revision: 7 });
  const captured = requests.at(-1);
  assert.equal(captured.headers.authorization, 'Bearer server-only-bearer-value');
  assert.equal(captured.url, '/api/v1/node?upstream=http://attacker.invalid');
});

test('forwards optimistic concurrency and idempotency headers', async () => {
  const response = await fetch(`${bffBase}/bff/node-control/api/v1/node/draft`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'if-match': '"node-r7"', 'idempotency-key': 'command-7', 'x-correlation-id': 'corr-browser' },
    body: JSON.stringify({ displayName: 'Live Node' }),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('etag'), '"node-r8"');
  const captured = requests.at(-1);
  assert.equal(captured.headers['if-match'], '"node-r7"');
  assert.equal(captured.headers['idempotency-key'], 'command-7');
  assert.equal(captured.headers['x-correlation-id'], 'corr-browser');
  assert.deepEqual(JSON.parse(captured.body), { displayName: 'Live Node' });
});

test('preserves Problem Details and Retry-After without hiding upstream status', async () => {
  const rateResponse = await fetch(`${bffBase}/bff/node-control/api/v1/tasks`);
  assert.equal(rateResponse.status, 429);
  assert.equal(rateResponse.headers.get('retry-after'), '7');
  assert.equal(rateResponse.headers.get('content-type'), 'application/problem+json');
  assert.deepEqual(await rateResponse.json(), { type: 'about:blank', status: 429, code: 'RATE_LIMITED', title: 'Rate limited', detail: 'Try later.', correlationId: 'corr-rate', retryable: true });

  const healthResponse = await fetch(`${bffBase}/bff/node-control/api/v1/node/health`);
  assert.equal(healthResponse.status, 503);
  assert.equal(healthResponse.headers.get('x-correlation-id'), 'corr-health');
  assert.equal((await healthResponse.json()).code, 'NODE_DEGRADED');
});

test('streams SSE with Last-Event-ID and disables buffering', async () => {
  const response = await fetch(`${bffBase}/bff/node-control/api/v1/events`, { headers: { 'last-event-id': 'evt-1' } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/event-stream/);
  assert.equal(response.headers.get('cache-control'), 'no-cache, no-store');
  assert.equal(response.headers.get('x-accel-buffering'), 'no');
  assert.equal(requests.at(-1).headers['last-event-id'], 'evt-1');
  assert.match(await response.text(), /id: evt-2/);
});

test('bridges the browser EventSource cursor query to Last-Event-ID without forwarding the query', async () => {
  const response = await fetch(`${bffBase}/bff/node-control/api/v1/events?lastEventId=evt-query-1`);
  assert.equal(response.status, 200);
  assert.equal(requests.at(-1).headers['last-event-id'], 'evt-query-1');
  assert.equal(requests.at(-1).url, '/api/v1/events');

  const invalid = await fetch(`${bffBase}/bff/node-control/api/v1/events?lastEventId=`);
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).code, 'CONSOLE_PROXY_EVENT_CURSOR_INVALID');
});

test('rejects non-contract routes and never follows upstream redirects', async () => {
  const beforeCount = requests.length;
  const forbidden = await fetch(`${bffBase}/bff/node-control/api/v1/runtime/internal`);
  assert.equal(forbidden.status, 404);
  assert.equal((await forbidden.json()).code, 'CONSOLE_PROXY_ROUTE_NOT_ALLOWED');
  assert.equal(requests.length, beforeCount);

  const redirect = await fetch(`${bffBase}/bff/node-control/api/v1/node/health?redirect=1`, { redirect: 'manual' });
  assert.equal(redirect.status, 307);
  assert.equal(redirect.headers.get('location'), 'http://127.0.0.1:1/credential-sink');
});
