import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const out = join(root, 'dist');
await mkdir(join(out, 'src', 'styles'), { recursive: true });
await cp(join(root, 'src'), join(out, 'src'), { recursive: true });
for (const name of ['font.css', 'Galmuri11.woff2', 'Galmuri11-Bold.woff2']) {
  await cp(join(root, 'flutter', 'assets', 'www', 'src', 'styles', name), join(out, 'src', 'styles', name));
}
const html = (await readFile(join(root, 'index.html'), 'utf8')).replace(
  'https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/galmuri.css',
  './src/styles/font.css',
);
await writeFile(join(out, 'index.html'), html);
