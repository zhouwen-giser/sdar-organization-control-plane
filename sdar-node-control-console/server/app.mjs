import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicConsoleConfig } from './config.mjs';
import { createNodeControlProxy } from './node-control-proxy.mjs';

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_TYPES = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

function json(response, status, value) {
  const body = Buffer.from(JSON.stringify(value));
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': body.length, 'cache-control': 'no-store' });
  response.end(body);
}

function runtimeScript(config) {
  const serialized = JSON.stringify(publicConsoleConfig(config)).replace(/</g, '\\u003c');
  return `<script>window.__SDAR_CONSOLE_CONFIG__=${serialized};</script>`;
}

function serveStatic(requestUrl, response, distRoot, config) {
  const pathname = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const requested = path.resolve(distRoot, `.${pathname}`);
  const distPrefix = `${path.resolve(distRoot)}${path.sep}`;
  let file = requested.startsWith(distPrefix) && fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : path.join(distRoot, 'index.html');
  if (!fs.existsSync(file)) {
    response.writeHead(503, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    return response.end('Console build is unavailable. Run npm run build.');
  }
  let body = fs.readFileSync(file);
  if (path.extname(file) === '.html') body = Buffer.from(body.toString('utf8').replace('</head>', `${runtimeScript(config)}</head>`));
  response.writeHead(200, { 'content-type': CONTENT_TYPES[path.extname(file)] || 'application/octet-stream', 'content-length': body.length, 'cache-control': path.extname(file) === '.html' ? 'no-store' : 'public, max-age=31536000, immutable' });
  response.end(body);
}

export function createConsoleBffServer(config, options = {}) {
  const distRoot = options.distRoot || path.join(moduleRoot, 'dist');
  const contractRoot = options.contractRoot || path.join(moduleRoot, 'contracts/node-control/v1.0.0');
  const proxy = config.mode === 'live' ? createNodeControlProxy({ ...config, contractRoot, fetchImpl: options.fetchImpl }) : undefined;
  return http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (requestUrl.pathname === '/health/live') return json(response, 200, { status: 'ok', gatewayMode: config.mode });
    if (requestUrl.pathname === '/console-config') return json(response, 200, publicConsoleConfig(config));
    if (requestUrl.pathname.startsWith('/bff/node-control')) {
      if (!proxy) return json(response, 503, { type: 'about:blank', status: 503, code: 'CONSOLE_LIVE_GATEWAY_DISABLED', title: 'Live gateway disabled', detail: 'Set CONSOLE_GATEWAY_MODE=live on the BFF server.' });
      const targetPath = requestUrl.pathname.slice('/bff/node-control'.length) || '/';
      return proxy(request, response, new URL(`${targetPath}${requestUrl.search}`, 'http://console.invalid'));
    }
    if (!['GET', 'HEAD'].includes(request.method || '')) return json(response, 405, { type: 'about:blank', status: 405, code: 'CONSOLE_METHOD_NOT_ALLOWED', title: 'Method not allowed', detail: 'Static Console routes are read-only.' });
    return serveStatic(requestUrl, response, distRoot, config);
  });
}
