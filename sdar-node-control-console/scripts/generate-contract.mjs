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

function fallbackTypeName(file) {
  const words = file
    .replace(/\.schema\.json$/, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  const name = words.map((word) => `${word[0].toUpperCase()}${word.slice(1)}`).join('');
  return /^[A-Za-z_$]/.test(name) ? name : `Schema${name}`;
}

function schemaTypeName(file, schema) {
  return typeof schema.title === 'string' && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(schema.title)
    ? schema.title
    : fallbackTypeName(file);
}

const schemaCache = new Map();

function loadSchema(file) {
  if (!schemaCache.has(file)) {
    schemaCache.set(file, JSON.parse(fs.readFileSync(path.join(schemaRoot, file), 'utf8')));
  }
  return schemaCache.get(file);
}

function resolvePointer(document, reference) {
  const fragment = reference.startsWith('#') ? reference.slice(1) : reference;
  if (fragment === '') return document;
  return fragment.split('/').slice(1).reduce((value, segment) => {
    const key = segment.replace(/~1/g, '/').replace(/~0/g, '~');
    return value?.[key];
  }, document);
}

function resolveReference(reference, currentDocument) {
  if (reference.startsWith('#')) {
    return { document: currentDocument, schema: resolvePointer(currentDocument, reference) };
  }
  const [file, fragment] = reference.split('#');
  const document = loadSchema(file);
  return {
    document,
    schema: fragment === undefined ? document : resolvePointer(document, `#${fragment}`),
    typeName: fragment === undefined ? schemaTypeName(file, document) : undefined,
  };
}

function tsType(schema = {}, currentDocument = schema) {
  if (schema.$ref) {
    const resolved = resolveReference(schema.$ref, currentDocument);
    if (!resolved.schema) throw new Error(`Unresolved schema reference: ${schema.$ref}`);
    return resolved.typeName || tsType(resolved.schema, resolved.document);
  }
  if (Object.hasOwn(schema, 'const')) return JSON.stringify(schema.const);
  if (schema.enum) return schema.enum.map((value) => JSON.stringify(value)).join(' | ');
  if (schema.oneOf) return schema.oneOf.map((value) => tsType(value, currentDocument)).join(' | ');
  if (schema.anyOf) return schema.anyOf.map((value) => tsType(value, currentDocument)).join(' | ');
  if (schema.allOf) return schema.allOf.map((value) => tsType(value, currentDocument)).join(' & ');
  if (Array.isArray(schema.type)) {
    return schema.type.map((type) => tsType({ ...schema, type }, currentDocument)).join(' | ');
  }
  switch (schema.type) {
    case 'string': return 'string';
    case 'integer':
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'array': {
      const itemType = tsType(schema.items, currentDocument);
      return itemType.includes(' | ') || itemType.includes(' & ') ? `(${itemType})[]` : `${itemType}[]`;
    }
    case 'object':
    default: {
      if (schema.properties) {
        const required = new Set(schema.required || []);
        const fields = Object.entries(schema.properties).map(([key, value]) =>
          `${JSON.stringify(key)}${required.has(key) ? '' : '?'}: ${tsType(value, currentDocument)}`,
        );
        return `{ ${fields.join('; ')} }`;
      }
      if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        return `Record<string, ${tsType(schema.additionalProperties, currentDocument)}>`;
      }
      return schema.type === 'object' ? 'Record<string, unknown>' : 'unknown';
    }
  }
}

const interfaces = [];
for (const file of fs.readdirSync(schemaRoot).filter((name) => name.endsWith('.json')).sort()) {
  const schema = loadSchema(file);
  const name = schemaTypeName(file, schema);
  const effectiveSchema = schema.$ref ? resolveReference(schema.$ref, schema).schema : schema;
  const required = new Set(effectiveSchema.required || []);
  const props = effectiveSchema.properties || {};
  const fields = Object.entries(props).map(([key, value]) =>
    `  ${JSON.stringify(key)}${required.has(key) ? '' : '?'}: ${tsType(value, schema)};`,
  );
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
