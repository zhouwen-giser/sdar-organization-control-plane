import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generated = path.join(root, 'src/api/generated/contract.ts');
const contractRoot = path.join(root, 'contracts/node-control/v1.0.0');
const before = fs.readFileSync(generated, 'utf8');
execFileSync(process.execPath, [path.join(root, 'scripts/generate-contract.mjs')], { cwd: root, stdio: 'pipe' });
const after = fs.readFileSync(generated, 'utf8');
if (before !== after) {
  fs.writeFileSync(generated, before);
  console.error('Generated contract DTO is stale. Run npm run contract:generate and commit the result.');
  process.exit(1);
}
const inventory = fs.readFileSync(path.join(contractRoot, 'matrices/operation-inventory.csv'), 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/).slice(1).filter(Boolean);
const schemaCount = fs.readdirSync(path.join(contractRoot, 'schemas')).filter((file) => file.endsWith('.schema.json')).length;
const openapi = fs.readFileSync(path.join(contractRoot, 'openapi/node-control.openapi.yaml'));
const sha256 = crypto.createHash('sha256').update(openapi).digest('hex');
const report = { ok: true, contractVersion: '1.0.0', contractStatus: 'PROTOCOL_DESIGN_FROZEN_IMPLEMENTATION_PENDING', publicOperationCount: inventory.length, schemaCount, nodeControlOpenApiSha256: sha256, generatedFile: path.relative(root, generated) };
fs.mkdirSync(path.join(root, 'evidence'), { recursive: true });
fs.writeFileSync(path.join(root, 'evidence/contract-check.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
