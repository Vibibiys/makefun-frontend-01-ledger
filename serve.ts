// serve.ts — a pocket static file server for trying the entry locally.
//
// It serves the app/ folder at the root, exactly as any static host would when
// it publishes the entry, so what you see at http://localhost:8080 is what the
// finalist review opens. Development only; it is not part of the handed-in app.
//
//   node serve.ts            (port 8080)
//   node serve.ts --port 9000

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(fileURLToPath(new URL('.', import.meta.url)), 'app');
const flagAt = process.argv.indexOf('--port');
const port = flagAt >= 0 ? Number(process.argv[flagAt + 1]) || 8080 : 8080;

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://127.0.0.1');
  const rel = normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, '');
  const target = join(appDir, rel === '' || rel === '.' ? 'index.html' : rel);
  if (!target.startsWith(appDir + sep) && target !== appDir) {
    res.writeHead(403, { 'Content-Type': 'text/plain' }).end('forbidden');
    return;
  }
  try {
    const body = await readFile(target);
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[extname(target)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
  }
});

server.listen(port, () => {
  console.log(`Ledger dev server: app/ at http://localhost:${port}`);
});
