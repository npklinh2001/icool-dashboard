// Copies the ride map build (cuoc-xe-dashboard/CUOC_XE_WEB/dist) into reports/cuoc-xe,
// which src/app/cuoc-xe serves to signed-in users.
// Usage: npm run sync:cuoc-xe [-- <path-to-dist>]
import { cp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const root = path.resolve(import.meta.dirname, '..');
const source = path.resolve(
  process.argv[2] ?? path.join(root, '..', 'cuoc-xe-dashboard', 'CUOC_XE_WEB', 'dist'),
);
const target = path.join(root, 'reports', 'cuoc-xe');

const index = await stat(path.join(source, 'index.html')).catch(() => null);
if (!index?.isFile()) {
  console.error(`Không tìm thấy index.html trong ${source}`);
  process.exit(1);
}

await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true });

// The route serves these .gz copies to browsers that accept gzip
for (const name of await readdir(target, { recursive: true })) {
  if (!/\.(js|css)$/.test(name)) continue;
  const file = path.join(target, name);
  await writeFile(`${file}.gz`, gzipSync(await readFile(file), { level: 9 }));
}

console.log(`Đã chép ${source} -> ${target}`);
