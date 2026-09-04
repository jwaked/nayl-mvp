import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const required = [
  'Dockerfile', 'package.json', 'server.js', 'backend-app.js',
  'index.html', 'business.html', 'admin.html', 'styles.css',
  'consumer.js', 'business.js', 'admin.js', 'shared.js',
  'SUPABASE_SETUP.sql'
];

for (const relative of required) {
  await fs.access(path.join(root, relative));
}

const files = (await fs.readdir(root))
  .filter((name) => name.endsWith('.js'))
  .map((name) => path.join(root, name));
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}

const forbidden = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /AIza[0-9A-Za-z_-]{30,}/,
  /BSA[A-Za-z0-9_-]{20,}/
];
for (const file of files) {
  const text = await fs.readFile(file, 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(text)) throw new Error(`Possible embedded secret in ${path.relative(root, file)}`);
  }
}

console.log(`Validated ${files.length} JavaScript files, required routes, and secret patterns.`);
