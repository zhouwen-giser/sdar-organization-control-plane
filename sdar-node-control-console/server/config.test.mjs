import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { loadConsoleBffConfig, publicConsoleConfig } from './config.mjs';

test('mock mode starts without live authority', () => {
  const config = loadConsoleBffConfig({});
  assert.equal(config.mode, 'mock');
  assert.equal(config.loopback, true);
  assert.equal('bearerToken' in config, false);
  assert.deepEqual(publicConsoleConfig(config), {
    gatewayMode: 'mock',
    activeDeploymentRole: undefined,
    securityClassification: 'LOCAL_MOCK',
  });
});

test('live mode validates a fixed upstream and exposes only deployment identity', () => {
  const config = loadConsoleBffConfig({
    CONSOLE_GATEWAY_MODE: 'live',
    SDAR_NODE_CONTROL_BASE_URL: 'http://127.0.0.1:10080/',
    SDAR_NODE_CONTROL_BEARER_TOKEN: 'server-token-value',
    SDAR_NODE_CONTROL_ROLE: 'node_operator',
  });
  assert.equal(config.upstreamBaseUrl.href, 'http://127.0.0.1:10080/');
  assert.equal(config.bearerToken, 'server-token-value');
  const publicConfig = publicConsoleConfig(config);
  assert.deepEqual(publicConfig, {
    gatewayMode: 'live',
    activeDeploymentRole: 'node_operator',
    securityClassification: 'LOOPBACK_SERVER_CREDENTIAL',
  });
  assert.equal('upstreamBaseUrl' in publicConfig, false);
  assert.equal('bearerToken' in publicConfig, false);
});

test('supports a server-side token file without returning its path', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sdar-console-config-'));
  const tokenFile = path.join(directory, 'node-control.token');
  try {
    fs.writeFileSync(tokenFile, 'token-from-file\n');
    const config = loadConsoleBffConfig({
      CONSOLE_GATEWAY_MODE: 'live',
      SDAR_NODE_CONTROL_BASE_URL: 'http://localhost:10080',
      SDAR_NODE_CONTROL_BEARER_TOKEN_FILE: tokenFile,
      SDAR_NODE_CONTROL_ROLE: 'node_viewer',
    });
    assert.equal(config.bearerToken, 'token-from-file');
    assert.doesNotMatch(JSON.stringify(publicConsoleConfig(config)), /node-control\.token|token-from-file/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('fails closed for ambiguous authority and unsafe public binding', () => {
  assert.throws(() => loadConsoleBffConfig({
    CONSOLE_GATEWAY_MODE: 'live',
    SDAR_NODE_CONTROL_BASE_URL: 'http://127.0.0.1:10080',
    SDAR_NODE_CONTROL_BEARER_TOKEN: 'one',
    SDAR_NODE_CONTROL_BEARER_TOKEN_FILE: 'other',
    SDAR_NODE_CONTROL_ROLE: 'node_admin',
  }), /only one/);
  assert.throws(() => loadConsoleBffConfig({ CONSOLE_BFF_HOST: '0.0.0.0' }), /Non-loopback bind/);
  assert.throws(() => loadConsoleBffConfig({
    CONSOLE_GATEWAY_MODE: 'live',
    SDAR_NODE_CONTROL_BASE_URL: 'http://user:password@127.0.0.1:10080',
    SDAR_NODE_CONTROL_BEARER_TOKEN: 'one',
    SDAR_NODE_CONTROL_ROLE: 'node_admin',
  }), /must not contain credentials/);
});
