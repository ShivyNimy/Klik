/**
 * Tiny zero-dependency static server for the standalone build in dist/.
 * Binds 0.0.0.0 so the sandbox preview can reach it.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.env.PORT || 5173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
};

const server = createServer(async (req, res) => {
  try {
    const rawPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const safeRel = normalize(rawPath).replace(/^(\.\.[/\\])+/, '');
    let file = resolve(join(root, safeRel === '/' ? 'index.html' : safeRel));

    if (!file.startsWith(root)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' }).end('Forbidden');
      return;
    }

    let body;
    let type = MIME[extname(file)] ?? 'application/octet-stream';
    try {
      body = await readFile(file);
    } catch {
      // Only route-like requests fall back to the app shell; a missing asset
      // must 404 so broken images are obvious instead of returning HTML.
      if (extname(file) && extname(file) !== '.html') {
        res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
        return;
      }
      file = join(root, 'index.html');
      type = MIME['.html'];
      body = await readFile(file);
    }

    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' }).end('Server error: ' + String(err));
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Klik standalone server → http://0.0.0.0:${port}`);
});

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    server.close(() => process.exit(0));
  });
}
