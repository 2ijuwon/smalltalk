import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { generateContent } from './content.mjs';

await generateContent({ checkAudio: true });

const root = process.cwd();
const out = join(root, 'dist');
await mkdir(join(out, 'src', 'styles'), { recursive: true });
await cp(join(root, 'src'), join(out, 'src'), { recursive: true });
for (const name of ['font.css', 'Galmuri11.woff2', 'Galmuri11-Bold.woff2']) {
  await cp(join(root, 'flutter', 'assets', 'www', 'src', 'styles', name), join(out, 'src', 'styles', name));
}
let html = (await readFile(join(root, 'index.html'), 'utf8')).replace(
  'https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/galmuri.css',
  './src/styles/font.css',
);
for (const path of ['src/styles/pixel.css', 'src/app.js']) {
  const hash = createHash('sha256').update(await readFile(join(out, path))).digest('hex').slice(0, 12);
  html = html.replace(`"./${path}"`, `"./${path}?v=${hash}"`);
}
await writeFile(join(out, 'index.html'), html);
