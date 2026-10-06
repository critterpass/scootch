// Serves the bundled site's static files for the browser tests. The one live route, the monster
// maker's door to the API, is not served here: the tests answer it at the network boundary.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../dist/client');
const port = Number(process.env['PORT'] ?? 4323);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost');
  const file = path.join(root, pathname.endsWith('/') ? `${pathname}index.html` : pathname);
  try {
    if (request.method !== 'GET' || !file.startsWith(root)) throw new Error('not served');
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'text/plain' });
    response.end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1');
