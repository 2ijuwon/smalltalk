import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
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
const modules = (await readdir(join(out, 'src'))).filter((name) => name.endsWith('.js')).sort();
const versionedAssets = [...modules.map((name) => `src/${name}`), 'src/styles/pixel.css', 'src/brand-icon.svg'];
const contents = await Promise.all(versionedAssets.map((path) => readFile(join(out, path), 'utf8')));
const hash = createHash('sha256');
versionedAssets.forEach((path, index) => hash.update(path).update('\0').update(contents[index]).update('\0'));
const version = hash.digest('hex').slice(0, 12);

for (let index = 0; index < modules.length; index += 1) {
  const code = contents[index].replace(/(\bfrom\s*['"])(\.\/[^'"\s]+\.js)(['"])/g,
    (_, before, specifier, after) => `${before}${specifier}?v=${version}${after}`);
  await writeFile(join(out, versionedAssets[index]), code);
}
for (const path of ['src/styles/pixel.css', 'src/app.js', 'src/brand-icon.svg']) {
  html = html.replace(`"./${path}"`, `"./${path}?v=${version}"`);
}
await writeFile(join(out, 'index.html'), html);
