import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const src = path.join(root, 'src');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (/\.(ts|tsx|css)$/.test(entry.name)) files.push(absolute);
  }
}
walk(src);
const violations = [];
const forbiddenMarkers = [
  ['unfinished marker', /\b(?:TODO|FIXME|TBD)\b/g],
  ['placeholder component', /\b(?:StructuredPlaceholder|PlatformPage|GenericPlaceholder)\b/g],
  ['coming soon copy', /Coming Soon|敬请期待/g],
  ['empty click handler', /onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/g],
];
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  for (const [rule, pattern] of forbiddenMarkers) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) violations.push({ file: path.relative(root, file), rule });
  }
  if (file.includes(`${path.sep}features${path.sep}`) && /from\s+['"][^'"]*(?:mockData|fixtures?)[^'"]*['"]/.test(content)) {
    violations.push({ file: path.relative(root, file), rule: 'feature imports fixture directly' });
  }
}
const routesSource = fs.readFileSync(path.join(src, 'routes.ts'), 'utf8');
const routePatterns = [...routesSource.matchAll(/pattern:\s*'([^']+)'/g)].map((match) => match[1]);
const uniqueRoutes = new Set(routePatterns);
if (routePatterns.length < 50) violations.push({ file: 'src/routes.ts', rule: `route inventory too small: ${routePatterns.length}` });
if (routePatterns.length !== uniqueRoutes.size) violations.push({ file: 'src/routes.ts', rule: 'duplicate public path' });
const contractSource = fs.readFileSync(path.join(src, 'api/generated/contract.ts'), 'utf8');
const operationIds = [...contractSource.matchAll(/"operationId":\s*"([^"]+)"/g)].map((match) => match[1]);
if (operationIds.length !== 85 || new Set(operationIds).size !== 85) violations.push({ file: 'src/api/generated/contract.ts', rule: `expected 85 unique operations, received ${operationIds.length}` });
const report = {
  ok: violations.length === 0,
  checkedAt: new Date().toISOString(),
  sourceFilesChecked: files.length,
  publicRouteCount: routePatterns.length,
  uniquePublicPathCount: uniqueRoutes.size,
  publicOperationCount: operationIds.length,
  violations,
};
fs.mkdirSync(path.join(root, 'evidence'), { recursive: true });
fs.writeFileSync(path.join(root, 'evidence/product-check.json'), `${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(report, null, 2));
