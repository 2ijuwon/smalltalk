import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, relative, resolve, sep } from 'node:path';

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
const types = { '.wav': 'audio/wav', '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    const requestedPath = pathname === '/' ? 'index.html' : pathname.slice(1);
    const file = resolve(root, requestedPath);
    const relativePath = relative(root, file);
    if (relativePath.startsWith(`..${sep}`) || relativePath === '..') throw new Error('invalid path');
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not a file');
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}).listen(port, host, () => console.log(`small talk: http://${host}:${port}`));
