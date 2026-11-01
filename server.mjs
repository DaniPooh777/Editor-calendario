/**
 * Local server for the calendar editor.
 *
 * - Serves the built app from dist/.
 * - Persists app state to datos-calendario.json (next to this file), so the
 *   calendar survives browser privacy settings, InPrivate windows and origin
 *   changes. The file also rides along with the OneDrive folder backup.
 *
 * Only Node built-ins are used: no npm install needed to run it.
 */

import { createServer } from 'node:http';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');
const DATA_FILE = join(ROOT, 'datos-calendario.json');
const PORT = Number(process.env.PORT) || 5173;
const HOST = '127.0.0.1';
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB is far beyond any real state.

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

/** Read a request body with a hard size cap. */
function readBody(req) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** Write via temp file + rename so a crash can never leave a half-written state. */
async function saveStateToDisk(body) {
  const tmp = `${DATA_FILE}.tmp`;
  await writeFile(tmp, body, 'utf8');
  await rename(tmp, DATA_FILE);
}

async function serveStatic(res, urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';

  // Path-traversal guard: the resolved file must stay inside dist/.
  const candidate = resolve(join(DIST, normalize(rel)));
  if (candidate !== DIST && !candidate.startsWith(DIST + sep)) {
    send(res, 403, 'Forbidden');
    return;
  }

  if (!existsSync(join(DIST, 'index.html'))) {
    send(
      res,
      503,
      'Falta la version compilada. Ejecuta "npm run build" en la carpeta del proyecto y vuelve a abrir el calendario.',
    );
    return;
  }

  try {
    const data = await readFile(candidate);
    send(res, 200, data, MIME[extname(candidate).toLowerCase()] ?? 'application/octet-stream');
  } catch {
    send(res, 404, 'Not found');
  }
}

async function handle(req, res) {
  const url = req.url ?? '/';

  if (url.startsWith('/api/state')) {
    if (req.method === 'GET') {
      try {
        const raw = await readFile(DATA_FILE, 'utf8');
        send(res, 200, raw, 'application/json; charset=utf-8');
      } catch {
        send(res, 404, JSON.stringify({ error: 'no-state-yet' }), 'application/json; charset=utf-8');
      }
      return;
    }

    if (req.method === 'PUT') {
      try {
        const body = await readBody(req);
        const parsed = JSON.parse(body);
        if (!parsed || typeof parsed !== 'object' || typeof parsed.state !== 'object' || parsed.state === null) {
          send(res, 400, JSON.stringify({ error: 'invalid-state' }), 'application/json; charset=utf-8');
          return;
        }
        await saveStateToDisk(body);
        send(res, 204, '');
      } catch (err) {
        const status = err instanceof SyntaxError ? 400 : 500;
        send(res, status, JSON.stringify({ error: String(err?.message ?? err) }), 'application/json; charset=utf-8');
      }
      return;
    }

    send(res, 405, 'Method not allowed');
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method not allowed');
    return;
  }

  await serveStatic(res, url);
}

const server = createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error(err);
    if (!res.headersSent) send(res, 500, 'Internal server error');
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`El puerto ${PORT} ya esta en uso: el calendario ya se esta ejecutando.`);
    process.exit(0);
  }
  console.error(err);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`Calendario corriendo en http://localhost:${PORT}`);
  console.log(`Los datos se guardan en: ${DATA_FILE}`);
});
