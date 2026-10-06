// Serves the bundled site's static files for the browser tests. The routes that run in the Worker
// are not served here: the tests answer the API at the network boundary, and the page of a shared
// thing (`/m/<id>`, `/c/<id>`, `/s/<id>`, `/t/<code>`, `/h/<id>`, `/r/<id>`) is served as its
// prebuilt page, as the Worker does.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', process.env['SITE_ROOT'] ?? 'dist/client');
const port = Number(process.env['PORT'] ?? 4323);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

/** The file an address stands for: a shared thing's page, a folder's index, or the file itself. */
function fileFor(pathname) {
  const shared = pathname.match(/^(\/vi)?\/([mcsthr])\/[a-z0-9-]+\/?$/);
  if (shared) return `${shared[1] ?? ''}/${shared[2]}/shell/index.html`;
  if (pathname.endsWith('/')) return `${pathname}index.html`;
  return path.extname(pathname) === '' ? `${pathname}/index.html` : pathname;
}

createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost');
  const file = path.join(root, fileFor(pathname));
  try {
    if (request.method !== 'GET' || !file.startsWith(root)) throw new Error('not served');
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'text/plain' });
    response.end(body);
  } catch {
    const notFound = await readFile(path.join(root, '404.html')).catch(() => 'Not found');
    response.writeHead(404, { 'Content-Type': types['.html'] }).end(notFound);
  }
}).listen(port, '127.0.0.1');
