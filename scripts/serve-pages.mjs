import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(projectDir, 'dist-pages');
const prefix = '/pizza-store-app/';
const port = Number(process.env.PAGES_PREVIEW_PORT || 4174);
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PAGES_PREVIEW_PORT must be a valid port number.');
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method not allowed.');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400);
    response.end('Invalid URL.');
    return;
  }

  if (pathname === prefix.slice(0, -1)) {
    response.writeHead(308, { Location: prefix });
    response.end();
    return;
  }

  if (!pathname.startsWith(prefix)) {
    response.writeHead(404);
    response.end('Not found.');
    return;
  }

  const relativePath = pathname.slice(prefix.length) || 'index.html';
  const filePath = path.resolve(outputDir, relativePath);
  if (!filePath.startsWith(`${outputDir}${path.sep}`)) {
    response.writeHead(404);
    response.end('Not found.');
    return;
  }

  try {
    const file = await stat(filePath);
    if (!file.isFile()) throw new Error('Not a file.');
    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream',
      'Content-Length': file.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    if (request.method === 'HEAD') response.end();
    else createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404);
    response.end('Not found.');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Static Pages demo available at http://127.0.0.1:${port}${prefix}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
