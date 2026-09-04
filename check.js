import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const required = [
  'Dockerfile', 'render.yaml', 'package.json', 'server.js', 'backend-app.js',
  'index.html', 'business.html', 'admin.html', 'styles.css',
  'consumer.js', 'business.js', 'admin.js', 'shared.js', 'SUPABASE_SETUP.sql'
];
for (const name of required) await fs.access(path.join(root, name));

const entries = await fs.readdir(root, { withFileTypes: true });
const directories = entries.filter((entry) => entry.isDirectory() && !['node_modules', '.data', '.git'].includes(entry.name));
if (directories.length) throw new Error(`Flat package contains unexpected directories: ${directories.map((item) => item.name).join(', ')}`);

const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.js')).map((entry) => path.join(root, entry.name));
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}

const forbidden = [/sk-[A-Za-z0-9_-]{20,}/, /AIza[0-9A-Za-z_-]{30,}/, /BSA[A-Za-z0-9_-]{20,}/, /re_[A-Za-z0-9_-]{20,}/];
for (const file of files) {
  const text = await fs.readFile(file, 'utf8');
  for (const pattern of forbidden) if (pattern.test(text)) throw new Error(`Possible embedded secret in ${path.basename(file)}`);
}

const app = await fs.readFile(path.join(root, 'backend-app.js'), 'utf8');
for (const route of ["'/api/search'", "'/api/admin/setup'", "'/api/consumer/register'", "'/api/business/register'"]) {
  if (!app.includes(route)) throw new Error(`Expected API route reference missing: ${route}`);
}
const http = await fs.readFile(path.join(root, 'backend-lib-http.js'), 'utf8');
for (const route of ["['/', 'index.html']", "['/business', 'business.html']", "['/admin', 'admin.html']"]) {
  if (!http.includes(route)) throw new Error(`Static route missing: ${route}`);
}
console.log(`Validated ${files.length} JavaScript files, flat layout, routes, and secret patterns.`);
