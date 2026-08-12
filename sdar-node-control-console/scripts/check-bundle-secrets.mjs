import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const distRoot = path.join(root, 'dist');
const reportPath = path.join(root, 'reports/single-node-live-integration/bundle-secret-scan.json');
const forbidden = [
  'SDAR_NODE_CONTROL_BEARER_TOKEN',
  'SDAR_NODE_CONTROL_BEARER_TOKEN_FILE',
  'SDAR_NODE_CONTROL_BASE_URL',
  'server-only-bearer-value',
];
const configuredToken = process.env.SDAR_NODE_CONTROL_BEARER_TOKEN?.trim();
if (configuredToken) forbidden.push(configuredToken);

if (!fs.existsSync(distRoot)) throw new Error('dist is missing; run npm run build before bundle secret scan');

const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else files.push(absolute);
  }
}
walk(distRoot);

const violations = [];
for (const file of files) {
  const content = fs.readFileSync(file).toString('utf8');
  forbidden.forEach((value, index) => {
    if (value && content.includes(value)) violations.push({ file: path.relative(root, file), marker: index < 4 ? value : 'configured-token-value' });
  });
}

const report = {
  ok: violations.length === 0,
  filesScanned: files.length,
  configuredTokenChecked: Boolean(configuredToken),
  serverOnlyConfigNamesChecked: true,
  violations,
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(report, null, 2));
