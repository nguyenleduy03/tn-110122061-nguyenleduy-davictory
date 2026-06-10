import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 5173;

const ROOT = path.join(__dirname, '..');
const MAIN_DIST = path.join(__dirname, 'dist');
const AI_TEST_DIST = path.join(ROOT, 'ai-test-frontend', 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

// [path_prefix, target_url]
const API_PROXY_RULES = [
  ['/api/ai/speaking/scoring', 'http://localhost:5183'],
  ['/api/ai/speaking', 'http://localhost:5183'],
  ['/api/admin/speaking', 'http://localhost:5183'],
  ['/api/ai/writing', 'http://localhost:5182'],
  ['/api/ai/evaluation', 'http://localhost:5182'],
  ['/api/admin/ai', 'http://localhost:5182'],

];

const BACKEND = 'http://localhost:8080';

function proxyTo(url, target, req, res) {
  const targetUrl = new URL(target);
  const options = {
    method: req.method,
    hostname: targetUrl.hostname,
    port: targetUrl.port,
    path: url.pathname + url.search,
    headers: { ...req.headers, host: targetUrl.host },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', () => {
    res.writeHead(504, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('504 Gateway Timeout - Backend unavailable');
  });

  req.pipe(proxyReq);
}

function serveStatic(res, filePath, fallbackHtml) {
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT' && fallbackHtml) {
        return fs.readFile(fallbackHtml, (err2, data2) => {
          if (err2) {
            res.writeHead(404);
            return res.end('Not Found');
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(data2);
        });
      }
      res.writeHead(500);
      return res.end('Internal Server Error');
    }

    const headers = { 'Content-Type': contentType };
    if (ext === '.js' || ext === '.css') {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    }
    res.writeHead(200, headers);
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // AI API proxy
  for (const [prefix, target] of API_PROXY_RULES) {
    if (url.pathname.startsWith(prefix)) {
      return proxyTo(url, target, req, res);
    }
  }

  // Backend API proxy
  if (url.pathname.startsWith('/api/')) {
    return proxyTo(url, BACKEND, req, res);
  }

  // AI Test UI at /ai-test/
  if (url.pathname.startsWith('/ai-test')) {
    const basePath = '/ai-test';
    const relativePath = url.pathname === basePath || url.pathname === basePath + '/'
      ? '/index.html'
      : url.pathname.slice(basePath.length);
    const filePath = path.join(AI_TEST_DIST, relativePath);
    const fallback = path.join(AI_TEST_DIST, 'index.html');
    return serveStatic(res, filePath, fallback);
  }

  // Main frontend
  const filePath = path.join(MAIN_DIST, url.pathname === '/' ? 'index.html' : url.pathname);
  const fallback = path.join(MAIN_DIST, 'index.html');
  serveStatic(res, filePath, fallback);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[serve] Production server running on http://127.0.0.1:${PORT}`);
  console.log(`[serve] Main FE: ${MAIN_DIST}`);
  console.log(`[serve] AI Test UI: ${AI_TEST_DIST} -> /ai-test/`);
  console.log(`[serve] Proxying AI APIs -> Python services (5182, 5183)`);
  console.log(`[serve] Proxying /api/* -> ${BACKEND}`);
});
