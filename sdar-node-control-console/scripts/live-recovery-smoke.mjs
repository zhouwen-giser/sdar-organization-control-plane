import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';

const port = Number(process.env.CONSOLE_RECOVERY_PORT ?? 4190);
const reportPath = path.resolve('reports/single-node-live-integration/p10-live-recovery-smoke.json');
const tokenFile = path.resolve(required('SDAR_NODE_CONTROL_BEARER_TOKEN_FILE'));
if (!fs.existsSync(tokenFile)) throw new Error('The server-only Node Control token file is missing.');

const baseEnvironment = {
  ...process.env,
  CONSOLE_GATEWAY_MODE: 'live',
  CONSOLE_BFF_HOST: '127.0.0.1',
  CONSOLE_BFF_PORT: String(port),
  SDAR_NODE_CONTROL_ROLE: 'node_admin',
  SDAR_NODE_CONTROL_BEARER_TOKEN_FILE: tokenFile,
};

const unreachable = await withBff({
  ...baseEnvironment,
  SDAR_NODE_CONTROL_BASE_URL: 'http://127.0.0.1:1',
}, async (baseUrl) => request(baseUrl, '/bff/node-control/api/v1/node'));
if (unreachable.status !== 502 || unreachable.body?.code !== 'CONSOLE_PROXY_UPSTREAM_FAILED') {
  throw new Error(`Expected fail-closed upstream response and received HTTP ${unreachable.status}.`);
}

const first = await withBff({
  ...baseEnvironment,
  SDAR_NODE_CONTROL_BASE_URL: 'http://127.0.0.1:20080',
}, async (baseUrl) => request(baseUrl, '/bff/node-control/api/v1/node'));
if (first.status !== 200 || typeof first.body?.nodeId !== 'string') throw new Error('The live BFF did not recover authoritative Node state.');

const restarted = await withBff({
  ...baseEnvironment,
  SDAR_NODE_CONTROL_BASE_URL: 'http://127.0.0.1:20080',
}, async (baseUrl) => request(baseUrl, '/bff/node-control/api/v1/node'));
if (restarted.status !== 200 || restarted.body?.nodeId !== first.body.nodeId) throw new Error('BFF restart did not recover the same authoritative Node.');

const serialized = JSON.stringify({ unreachable, first, restarted });
const token = fs.readFileSync(tokenFile, 'utf8').trim();
if (serialized.includes(token) || serialized.includes(tokenFile)) throw new Error('Recovery evidence contains server authority.');

const result = {
  schemaVersion: 1,
  ok: true,
  observedAt: new Date().toISOString(),
  isolatedBffPort: port,
  nodeControlUnreachable: {
    status: unreachable.status,
    problemCode: unreachable.body.code,
  },
  firstRecovery: {
    status: first.status,
    nodeIdSha256: sha256(first.body.nodeId),
  },
  bffRestartRecovery: {
    status: restarted.status,
    sameAuthoritativeNode: restarted.body.nodeId === first.body.nodeId,
  },
  browserSnapshotUsedAsAuthority: false,
  authoritativeGetAfterRecovery: true,
  realSdarProcessStopped: false,
  realSmppProcessStopped: false,
  deviceWriteGateChanged: false,
  secretsIncluded: false,
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));

async function withBff(environment, action) {
  await assertPortFree(port);
  const child = spawn(process.execPath, ['server/main.mjs'], {
    cwd: process.cwd(),
    env: environment,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const diagnostics = [];
  child.stdout.on('data', (chunk) => diagnostics.push(String(chunk)));
  child.stderr.on('data', (chunk) => diagnostics.push(String(chunk)));
  try {
    const baseUrl = new URL(`http://127.0.0.1:${port}`);
    await waitForHealth(baseUrl, child, diagnostics);
    return await action(baseUrl);
  } finally {
    child.kill('SIGTERM');
    await Promise.race([new Promise((resolve) => child.once('exit', resolve)), delay(5_000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
    await waitForPortFree(port);
  }
}

async function waitForHealth(baseUrl, child, diagnostics) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Temporary BFF exited early: ${redact(diagnostics.join(''))}`);
    try {
      const response = await httpJson(new URL('/health/live', baseUrl));
      if (response.status === 200) return;
    } catch {}
    await delay(100);
  }
  throw new Error(`Temporary BFF did not become healthy in time: ${redact(diagnostics.join(''))}`);
}

async function request(baseUrl, relativePath) {
  return httpJson(new URL(relativePath, baseUrl));
}

function httpJson(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, { timeout: 3_000 }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        try {
          resolve({ status: response.statusCode ?? 0, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) });
        } catch (error) {
          reject(error);
        }
      });
    });
    request.once('error', reject);
    request.once('timeout', () => request.destroy(new Error('Local BFF request timed out.')));
  });
}

async function assertPortFree(targetPort) {
  const free = await portIsFree(targetPort);
  if (!free) throw new Error(`Recovery test port ${targetPort} is already in use.`);
}

async function waitForPortFree(targetPort) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (await portIsFree(targetPort)) return;
    await delay(100);
  }
  throw new Error(`Temporary BFF did not release port ${targetPort}.`);
}

function portIsFree(targetPort) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port: targetPort });
    socket.once('connect', () => { socket.destroy(); resolve(false); });
    socket.once('error', () => resolve(true));
    socket.setTimeout(500, () => { socket.destroy(); resolve(true); });
  });
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function redact(value) {
  return value.replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]').slice(0, 500);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
