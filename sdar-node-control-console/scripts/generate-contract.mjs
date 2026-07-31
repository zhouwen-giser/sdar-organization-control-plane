import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contractRoot = path.join(root, 'contracts/node-control/v1.0.0');
const schemaRoot = path.join(contractRoot, 'schemas');
const csv = fs.readFileSync(path.join(contractRoot, 'matrices/operation-inventory.csv'), 'utf8').replace(/^\uFEFF/, '').trim();
const lines = csv.split(/\r?\n/);
const headers = lines.shift().split(',');
const operations = lines.filter(Boolean).map((line) => {
  const values = line.split(',');
  return Object.fromEntries(headers.map((key, index) => [key, values[index]]));
});

function tsType(schema = {}) {
  if (schema.$ref) {
    const file = schema.$ref.split('/').pop();
    const ref = JSON.parse(fs.readFileSync(path.join(schemaRoot, file), 'utf8'));
    return ref.title || 'JsonObject';
  }
  if (schema.enum) return schema.enum.map((value) => JSON.stringify(value)).join(' | ');
  if (schema.oneOf) return schema.oneOf.map(tsType).join(' | ');
  if (schema.anyOf) return schema.anyOf.map(tsType).join(' | ');
  if (Array.isArray(schema.type)) return schema.type.map((type) => tsType({ ...schema, type })).join(' | ');
  switch (schema.type) {
    case 'string': return 'string';
    case 'integer':
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'array': return `${tsType(schema.items)}[]`;
    case 'object': return schema.properties ? 'JsonObject' : 'Record<string, unknown>';
    default: return 'unknown';
  }
}

const interfaces = [];
for (const file of fs.readdirSync(schemaRoot).filter((name) => name.endsWith('.json')).sort()) {
  const schema = JSON.parse(fs.readFileSync(path.join(schemaRoot, file), 'utf8'));
  const name = schema.title || file.replace(/\.schema\.json$/, '').replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
  const required = new Set(schema.required || []);
  const props = schema.properties || {};
  const fields = Object.entries(props).map(([key, value]) => `  ${JSON.stringify(key)}${required.has(key) ? '' : '?'}: ${tsType(value)};`);
  interfaces.push(`export interface ${name} {\n${fields.join('\n')}\n}`);
}

const openapiPath = path.join(contractRoot, 'openapi/node-control.openapi.yaml');
const openapiSha256 = crypto.createHash('sha256').update(fs.readFileSync(openapiPath)).digest('hex');
const output = `/* Generated from SDAR v1.4 Node Control Backend frozen contract. Do not edit. */\n` +
`export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];\n` +
`export interface JsonObject { [key: string]: JsonValue | undefined; }\n\n` +
`${interfaces.join('\n\n')}\n\n` +
`export type ContractOperation = { readonly operationId: string; readonly method: string; readonly path: string; readonly tag: string; readonly kind: 'query' | 'command' };\n` +
`export const CONTRACT_VERSION = '1.0.0' as const;\n` +
`export const CONTRACT_STATUS = 'PROTOCOL_DESIGN_FROZEN_IMPLEMENTATION_PENDING' as const;\n` +
`export const OPENAPI_SHA256 = '${openapiSha256}' as const;\n` +
`export const CONTRACT_OPERATIONS = ${JSON.stringify(operations, null, 2)} as const satisfies readonly ContractOperation[];\n`;
fs.writeFileSync(path.join(root, 'src/api/generated/contract.ts'), output);
console.log(`generated ${operations.length} operations and ${interfaces.length} schemas`);
