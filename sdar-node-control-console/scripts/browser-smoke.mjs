import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';

const root = process.cwd();
const evidenceDir = path.join(root, 'evidence');
const screenshotDir = path.join(evidenceDir, 'screenshots');
fs.mkdirSync(screenshotDir, { recursive: true });
const host = '127.0.0.1';
const debugPort = 9224;
const chromium = process.env.CHROMIUM_PATH || 'chromium';
const distIndex = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
const cssFile = fs.readdirSync(path.join(root, 'dist/assets')).find((name) => name.endsWith('.css'));
const jsFile = fs.readdirSync(path.join(root, 'dist/assets')).find((name) => name.endsWith('.js'));
if (!cssFile || !jsFile) throw new Error('Built CSS or JS asset is missing');
const css = fs.readFileSync(path.join(root, 'dist/assets', cssFile), 'utf8');
const js = fs.readFileSync(path.join(root, 'dist/assets', jsFile), 'utf8');
const inlineHtml = distIndex
  .replace(/<link[^>]+href="[^"]+\.css"[^>]*>/, `<style>${css}</style>`)
  .replace(/<script[^>]+src="[^"]+\.js"[^>]*><\/script>/, '');

const browser = spawn(chromium, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-extensions', '--hide-scrollbars',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=/tmp/sdar-node-console-chromium-${process.pid}`, 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitForJson(url, attempts = 80) {
  let last;
  for (let i = 0; i < attempts; i += 1) {
    try { const response = await fetch(url); if (response.ok) return response.json(); } catch (error) { last = error; }
    await sleep(100);
  }
  throw last || new Error(`Timed out waiting for ${url}`);
}

class CdpClient {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); this.listeners = new Map(); }
  async connect() {
    this.socket = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', async (event) => {
      const raw = typeof event.data === 'string' ? event.data : event.data instanceof Blob ? await event.data.text() : Buffer.from(event.data).toString('utf8');
      const message = JSON.parse(raw);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message)); else pending.resolve(message.result);
        return;
      }
      for (const listener of this.listeners.get(message.method) || []) listener(message.params || {});
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }
  close() { this.socket?.close(); }
}

const routeSource = fs.readFileSync(path.join(root, 'src/routes.ts'), 'utf8');
const routePatterns = [...routeSource.matchAll(/pattern:\s*'([^']+)'/g)].map((match) => match[1]);
function concrete(pattern) {
  const exact = {
    '/configuration/:id/:revision': '/configuration/runtime-policy/7',
    '/llm/providers/:id': '/llm/providers/llm-openai-primary',
    '/llm/routes/:id': '/llm/routes/route-planning',
    '/smpp/sources/:id': '/smpp/sources/smpp-main',
    '/mcp/candidates/:id': '/mcp/candidates/candidate-weather',
    '/mcp/bindings/:id': '/mcp/bindings/mcp-weather',
    '/skills/:id/versions': '/skills/skill-route-plan/versions',
    '/skills/:id/versions/:version': '/skills/skill-route-plan/versions/2.4.0',
    '/plans/:id/versions': '/plans/plan-urban-delivery/versions',
    '/plans/:id/versions/:version': '/plans/plan-urban-delivery/versions/3.1.0',
    '/capabilities/:id/:version': '/capabilities/cap-route-planning/1',
    '/capabilities/:id/:version/implementations': '/capabilities/cap-route-planning/1/implementations',
    '/readiness/:id/:version': '/readiness/cap-route-planning/1',
    '/a2a/exposures/:id/:version': '/a2a/exposures/exposure-route-plan/3',
    '/a2a/agent-card/:id': '/a2a/agent-card/agent-card-18',
    '/tasks/:id': '/tasks/task-20260731-1042',
    '/tasks/:id/binding': '/tasks/task-20260731-1042/binding',
    '/operations/:id': '/operations/op-sync-smpp-441',
  };
  return exact[pattern] || pattern;
}

const screenshotRoutes = [
  ['/overview', 'overview-1440x900.png'], ['/node/health', 'node-health.png'], ['/configuration/runtime-policy/7', 'configuration-revision.png'],
  ['/llm/providers', 'llm-providers.png'], ['/smpp/sources/smpp-main', 'smpp-source-detail.png'], ['/mcp/bindings/mcp-weather', 'mcp-binding-detail.png'],
  ['/skills', 'skills.png'], ['/capabilities/cap-route-planning/1', 'capability-detail.png'], ['/readiness', 'readiness.png'],
  ['/a2a/exposures', 'a2a-exposures.png'], ['/tasks/task-20260731-1042', 'task-detail.png'], ['/evidence-export', 'evidence-export.png'],
  ['/operations', 'operations.png'], ['/audit', 'audit.png'], ['/events', 'events.png'], ['/access', 'rbac.png'], ['/contract', 'contract-traceability.png'],
  ['/404-check', '404.png'],
];

let client;
const browserErrors = [];
try {
  await waitForJson(`http://${host}:${debugPort}/json/version`);
  const targets = await waitForJson(`http://${host}:${debugPort}/json/list`);
  const page = targets.find((target) => target.type === 'page');
  if (!page) throw new Error('No Chromium page target');
  client = new CdpClient(page.webSocketDebuggerUrl);
  await client.connect();
  client.on('Runtime.exceptionThrown', ({ exceptionDetails }) => browserErrors.push({ type: 'exception', text: exceptionDetails?.text || 'Runtime exception' }));
  client.on('Log.entryAdded', ({ entry }) => { if (entry?.level === 'error') browserErrors.push({ type: 'console', text: entry.text }); });
  await client.send('Runtime.enable'); await client.send('Page.enable'); await client.send('Log.enable');
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const frameTree = await client.send('Page.getFrameTree');
  await client.send('Page.setDocumentContent', { frameId: frameTree.frameTree.frame.id, html: inlineHtml });
  await client.send('Runtime.evaluate', { expression: js, awaitPromise: true });
  await sleep(1200);
  await client.send('Runtime.evaluate', { expression: `window.location.hash = '/overview'; true` });
  await sleep(400);
  browserErrors.length = 0;

  const results = [];
  for (const pattern of routePatterns) {
    const route = concrete(pattern);
    const beforeErrorCount = browserErrors.length;
    await client.send('Runtime.evaluate', { expression: `window.location.hash = ${JSON.stringify(route)}; true`, awaitPromise: true });
    await sleep(280);
    const evaluation = await client.send('Runtime.evaluate', {
      expression: `JSON.stringify({ heading: document.querySelector('main h1')?.textContent?.trim() || '', bodyLength: document.body.innerText.length, notFound: document.body.innerText.includes('页面不存在'), viteOverlay: Boolean(document.querySelector('vite-error-overlay')), loading: document.body.innerText.includes('正在加载') })`,
      returnByValue: true,
    });
    const state = JSON.parse(evaluation.result.value);
    const errors = browserErrors.slice(beforeErrorCount);
    const expectedNotFound = false;
    const ok = Boolean(state.heading) && state.bodyLength > 200 && !state.viteOverlay && state.notFound === expectedNotFound && errors.length === 0;
    results.push({ pattern, route, ...state, errors, ok });
  }

  for (const [route, filename] of screenshotRoutes) {
    await client.send('Runtime.evaluate', { expression: `window.location.hash = ${JSON.stringify(route)}; true` });
    await sleep(420);
    const shot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    fs.writeFileSync(path.join(screenshotDir, filename), Buffer.from(shot.data, 'base64'));
  }
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await client.send('Runtime.evaluate', { expression: `window.location.hash = '/overview'; true` });
  await sleep(500);
  const compactShot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  fs.writeFileSync(path.join(screenshotDir, 'overview-1280x720.png'), Buffer.from(compactShot.data, 'base64'));

  const report = { ok: results.every((item) => item.ok), checkedAt: new Date().toISOString(), viewport: '1440x900', routeCount: results.length, passedRouteCount: results.filter((item) => item.ok).length, screenshotCount: screenshotRoutes.length + 1, browserErrors, results };
  fs.writeFileSync(path.join(evidenceDir, 'browser-smoke.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, routeCount: report.routeCount, passedRouteCount: report.passedRouteCount, screenshotCount: report.screenshotCount, browserErrorCount: browserErrors.length }, null, 2));
  if (!report.ok) process.exitCode = 1;
} finally {
  client?.close();
  browser.kill('SIGKILL');
}
