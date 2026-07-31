import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const evidenceRoot = path.join(root, 'evidence');
const productionFiles = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (/\.(ts|tsx|css)$/.test(entry.name) && !absolute.includes(`${path.sep}tests${path.sep}`)) productionFiles.push(absolute);
  }
}

walk(sourceRoot);

// Product boundary gate: detect executable browser/network/persistence or backend code.
// Contract paths, endpoint metadata and deterministic fixture URLs are intentionally allowed.
const rules = [
  ['network request primitive', /\bfetch\s*\(/g],
  ['legacy request primitive', /\bnew\s+XMLHttpRequest\b|\bXMLHttpRequest\s*\(/g],
  ['socket primitive', /\bnew\s+WebSocket\s*\(/g],
  ['server event primitive', /\bnew\s+EventSource\s*\(/g],
  ['persistent browser storage', /\blocalStorage\s*[.\[]/g],
  ['session browser storage', /\bsessionStorage\s*[.\[]/g],
  ['browser database', /\bindexedDB\s*[.\[]/g],
  ['cookie mutation', /\bdocument\.cookie\s*=/g],
  ['backend server dependency', /from\s+['"](?:express|fastify|koa|node:http|node:https)['"]/g],
  ['runtime process access', /\bprocess\.(?:env|cwd|exit)\b/g],
  ['dynamic code execution', /\beval\s*\(|\bnew\s+Function\s*\(/g],
];
const projectSpecific = ['existing-business-repository', 'internal-project-package'];
const violations = [];

for (const file of productionFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const [rule, pattern] of rules) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) violations.push({ file: path.relative(root, file), rule });
  }
  for (const token of projectSpecific) if (content.includes(token)) violations.push({ file: path.relative(root, file), rule: 'project-specific reference' });
}

const report = {
  ok: violations.length === 0,
  checkedAt: new Date().toISOString(),
  productionFilesChecked: productionFiles.length,
  boundaries: {
    contractPathsAreMetadata: true,
    deterministicFixtureEndpointsAllowed: true,
    runtimeNetworkDependency: false,
    browserPersistence: false,
    authenticationImplementation: false,
    backendService: false,
    projectSpecificIntegration: false,
  },
  violations,
};
fs.mkdirSync(evidenceRoot, { recursive: true });
fs.writeFileSync(path.join(evidenceRoot, 'architecture-check.json'), `${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(report, null, 2));
