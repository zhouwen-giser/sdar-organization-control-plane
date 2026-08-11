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
      const headers = new Headers({ authorization: `Bearer ${bearerToken}` });
      for (const name of REQUEST_HEADERS) {
        const value = request.headers[name];
        if (typeof value === 'string') headers.set(name, value);
      }
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
      return problem(response, status, status === 413 ? 'CONSOLE_PROXY_BODY_TOO_LARGE' : 'CONSOLE_PROXY_UPSTREAM_FAILED', status === 413 ? 'Request too large' : 'Node Control upstream failed', error instanceof Error ? error.message : 'The upstream request failed.');
    }
  };
}
