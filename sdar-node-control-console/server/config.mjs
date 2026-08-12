import fs from 'node:fs';
import path from 'node:path';

const LIVE_ROLES = new Set(['node_admin', 'node_operator', 'node_viewer', 'security_admin', 'organization_service']);
const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);

function required(environment, name) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required in live mode`);
  return value;
}

function bearerToken(environment) {
  const inline = environment.SDAR_NODE_CONTROL_BEARER_TOKEN?.trim();
  const file = environment.SDAR_NODE_CONTROL_BEARER_TOKEN_FILE?.trim();
  if (inline && file) throw new Error('Configure only one Node Control bearer token source');
  const token = inline || (file ? fs.readFileSync(path.resolve(file), 'utf8').trim() : '');
  if (!token) throw new Error('A server-only Node Control bearer token is required in live mode');
  if (/\s/.test(token)) throw new Error('Node Control bearer token must not contain whitespace');
  return token;
}

function upstreamBaseUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('SDAR_NODE_CONTROL_BASE_URL must use http or https');
  if (url.username || url.password || url.search || url.hash) throw new Error('SDAR_NODE_CONTROL_BASE_URL must not contain credentials, query or fragment');
  url.pathname = url.pathname.replace(/\/$/, '');
  return url;
}

export function loadConsoleBffConfig(environment = process.env) {
  const mode = environment.CONSOLE_GATEWAY_MODE?.trim() || 'mock';
  if (!['mock', 'live'].includes(mode)) throw new Error('CONSOLE_GATEWAY_MODE must be mock or live');
  const host = environment.CONSOLE_BFF_HOST?.trim() || '127.0.0.1';
  const port = Number(environment.CONSOLE_BFF_PORT || 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('CONSOLE_BFF_PORT must be an integer between 1 and 65535');
  const loopback = LOOPBACK_HOSTS.has(host);
  if (!loopback && environment.CONSOLE_ALLOW_UNAUTHENTICATED_NON_LOOPBACK !== 'YES') {
    throw new Error('Non-loopback bind requires CONSOLE_ALLOW_UNAUTHENTICATED_NON_LOOPBACK=YES');
  }
  if (mode === 'mock') {
    return Object.freeze({ mode, host, port, loopback, securityClassification: loopback ? 'LOCAL_MOCK' : 'NOT_PRODUCTION_AUTHENTICATED' });
  }
  const role = required(environment, 'SDAR_NODE_CONTROL_ROLE');
  if (!LIVE_ROLES.has(role)) throw new Error(`Unsupported live deployment role: ${role}`);
  return Object.freeze({
    mode,
    host,
    port,
    loopback,
    securityClassification: loopback ? 'LOOPBACK_SERVER_CREDENTIAL' : 'NOT_PRODUCTION_AUTHENTICATED',
    role,
    upstreamBaseUrl: upstreamBaseUrl(required(environment, 'SDAR_NODE_CONTROL_BASE_URL')),
    bearerToken: bearerToken(environment),
  });
}

export function publicConsoleConfig(config) {
  return {
    gatewayMode: config.mode,
    activeDeploymentRole: config.mode === 'live' ? config.role : undefined,
    securityClassification: config.securityClassification,
  };
}
