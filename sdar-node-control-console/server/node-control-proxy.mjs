import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

const REQUEST_HEADERS = ['accept', 'content-type', 'if-match', 'if-none-match', 'idempotency-key', 'last-event-id', 'x-request-id', 'x-correlation-id'];
const RESPONSE_HEADERS = ['content-type', 'etag', 'retry-after', 'cache-control', 'location', 'x-request-id', 'x-correlation-id'];
const MAX_BODY_BYTES = 1024 * 1024;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function loadPublicOperationAllowlist(contractRoot) {
  const inventory = fs.readFileSync(path.join(contractRoot, 'matrices/operation-inventory.csv'), 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const headers = inventory.shift().split(',');
  return inventory.filter(Boolean).map((line) => {
    const values = line.split(',');
    const operation = Object.fromEntries(headers.map((name, index) => [name, values[index]]));
    const pattern = escapeRegex(operation.path).replace(/\\\{[^/]+\\\}/g, '[^/]+');
    return { ...operation, regex: new RegExp(`^${pattern}$`) };
  });
}

function safePath(pathname) {
  if (/%2f|%5c/i.test(pathname) || pathname.includes('\\') || pathname.includes('//')) return undefined;
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return undefined; }
  if (!decoded.startsWith('/') || decoded.split('/').includes('..')) return undefined;
  return decoded;
}

function eventCursor(targetUrl, pathname) {
  const cursor = targetUrl.searchParams.get('lastEventId');
  if (cursor === null) return undefined;
  if (pathname !== '/api/v1/events' || cursor.trim() !== cursor || cursor.length < 1 || cursor.length > 512 || /[\u0000-\u001f\u007f]/u.test(cursor)) {
    throw Object.assign(new Error('The SSE cursor is invalid.'), { status: 400 });
  }
  targetUrl.searchParams.delete('lastEventId');
  return cursor;
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('Request body exceeds 1 MiB'), { status: 413 });
    chunks.push(chunk);
  }
  return chunks.length === 0 ? undefined : Buffer.concat(chunks);
}

function problem(response, status, code, title, detail) {
  const body = Buffer.from(JSON.stringify({ type: 'about:blank', status, code, title, detail }));
  response.writeHead(status, { 'content-type': 'application/problem+json', 'content-length': body.length, 'cache-control': 'no-store' });
  response.end(body);
}

export function createNodeControlProxy({ upstreamBaseUrl, bearerToken, contractRoot, fetchImpl = fetch }) {
  const operations = loadPublicOperationAllowlist(contractRoot);
  return async function proxy(request, response, targetUrl) {
    const pathname = safePath(targetUrl.pathname);
    if (!pathname) return problem(response, 400, 'CONSOLE_PROXY_PATH_INVALID', 'Invalid proxy path', 'The requested Node Control path is not valid.');
    const operation = operations.find((candidate) => candidate.method === request.method && candidate.regex.test(pathname));
    if (!operation) return problem(response, 404, 'CONSOLE_PROXY_ROUTE_NOT_ALLOWED', 'Route not allowed', 'The requested method and path are outside the frozen public Node Control contract.');
    try {
      const cursor = eventCursor(targetUrl, pathname);
      const headers = new Headers({ authorization: `Bearer ${bearerToken}` });
      for (const name of REQUEST_HEADERS) {
        const value = request.headers[name];
        if (typeof value === 'string') headers.set(name, value);
      }
      if (cursor !== undefined) headers.set('last-event-id', cursor);
      const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await readBody(request);
      const upstreamPath = `${upstreamBaseUrl.pathname.replace(/\/$/, '')}${pathname}${targetUrl.search}`;
      const upstream = new URL(upstreamPath, upstreamBaseUrl.origin);
      const upstreamResponse = await fetchImpl(upstream, { method: request.method, headers, body, redirect: 'manual' });
      const responseHeaders = {};
      for (const name of RESPONSE_HEADERS) {
        const value = upstreamResponse.headers.get(name);
        if (value !== null) responseHeaders[name] = value;
      }
      if ((upstreamResponse.headers.get('content-type') || '').startsWith('text/event-stream')) {
        responseHeaders['cache-control'] = 'no-cache, no-store';
        responseHeaders['x-accel-buffering'] = 'no';
      }
      response.writeHead(upstreamResponse.status, responseHeaders);
      if (!upstreamResponse.body) return response.end();
      Readable.fromWeb(upstreamResponse.body).pipe(response);
    } catch (error) {
      const status = Number(error?.status) || 502;
      const code = status === 413 ? 'CONSOLE_PROXY_BODY_TOO_LARGE' : status === 400 ? 'CONSOLE_PROXY_EVENT_CURSOR_INVALID' : 'CONSOLE_PROXY_UPSTREAM_FAILED';
      const title = status === 413 ? 'Request too large' : status === 400 ? 'Invalid event cursor' : 'Node Control upstream failed';
      return problem(response, status, code, title, error instanceof Error ? error.message : 'The upstream request failed.');
    }
  };
}
