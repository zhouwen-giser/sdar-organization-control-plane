import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inventoryPath = path.join(root, 'contracts/node-control/v1.0.0/matrices/operation-inventory.csv');
const outputPath = path.join(root, 'reports/single-node-live-integration/operation-coverage.csv');
const lines = fs.readFileSync(inventoryPath, 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/);
const headers = lines.shift().split(',');
const operations = lines.filter(Boolean).map((line) => {
  const values = line.split(',');
  return Object.fromEntries(headers.map((key, index) => [key, values[index]]));
});

const renamed = new Map([
  ['getEvidenceExportConfiguration', 'getTelemetryExportConfiguration'],
  ['createEvidenceExportRevision', 'createTelemetryExportRevision'],
  ['validateEvidenceExportRevision', 'validateTelemetryExportRevision'],
  ['publishEvidenceExportRevision', 'publishTelemetryExportRevision'],
  ['getEvidenceExportStatus', 'getTelemetryExportStatus'],
  ['testEvidenceExportConnection', 'testTelemetryExportConnection'],
]);
const newOperations = new Set([
  'getEpisodeEvidenceManifest',
  'listEvidenceDeadLetters',
  'listEvidenceOutbox',
  'listEvidenceProjectionIssues',
  'listEvidenceQualityIssues',
  'listEvidenceSourceCheckpoints',
  'reconcileEvidenceCoverage',
  'replayEvidence',
  'retryEvidenceDeadLetter',
]);
const surfaceByTag = {
  Discovery: '/overview;/contract',
  Node: '/node;/node/health',
  Configuration: '/configuration',
  LLM: '/llm/providers;/llm/routes',
  SMPP: '/smpp/sources',
  MCP: '/mcp/candidates;/mcp/bindings',
  Skills: '/skills',
  PlanTemplates: '/plans',
  Capabilities: '/capabilities;/readiness',
  A2A: '/a2a/exposures;/a2a/agent-card',
  Tasks: '/tasks',
  EvidenceExport: '/evidence-export',
  Operations: '/operations',
  Audit: '/audit',
  Events: '/events',
};
const columns = [
  'operationId', 'method', 'path', 'tag', 'kind', 'contract_status', 'ui_surface',
  'gateway_mapping', 'http_contract_test', 'real_integration_test', 'browser_e2e', 'notes',
];

function csv(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const rows = operations.map((operation) => {
  const previous = renamed.get(operation.operationId);
  return {
    ...operation,
    contract_status: previous ? 'RENAMED' : newOperations.has(operation.operationId) ? 'NEW' : 'UNCHANGED',
    ui_surface: surfaceByTag[operation.tag] ?? '/contract',
    gateway_mapping: 'PENDING_LIVE_GATEWAY_P02',
    http_contract_test: 'PENDING_P02',
    real_integration_test: 'PENDING_P03_P08',
    browser_e2e: 'PENDING_P10',
    notes: previous ? `replaces ${previous}` : newOperations.has(operation.operationId) ? 'new canonical Evidence operation' : '',
  };
});

if (rows.length !== 94 || new Set(rows.map((row) => row.operationId)).size !== 94) {
  throw new Error(`Expected 94 unique public operations, received ${rows.length}`);
}
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${columns.join(',')}\n${rows.map((row) => columns.map((column) => csv(row[column])).join(',')).join('\n')}\n`);
console.log(`generated coverage for ${rows.length} public operations`);
