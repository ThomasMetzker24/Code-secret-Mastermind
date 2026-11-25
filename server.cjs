'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = new Set(['index.html', 'style.css', 'game.js', 'app.js', 'pwa.js', 'sw.js', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
  'assets/code-secret-qr.png', 'assets/code-secret-qr.svg', 'tests/browser.html', 'tests/browser.js']);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  // Also serve the GitHub Pages subfolder locally to check relative paths.
  const localPath = pathname.startsWith('/Code-secret-Mastermind/') ? pathname.slice('/Code-secret-Mastermind'.length) : pathname;
  const file = localPath === '/' ? 'index.html' : localPath.slice(1);
  if (!files.has(file)) { res.writeHead(404); res.end('Not found'); return; }
  fs.readFile(path.join(__dirname, file), (error, data) => {
    res.writeHead(error ? 500 : 200, { 'Content-Type': `${types[path.extname(file)]}; charset=utf-8`, 'Cache-Control': 'no-store' });
    res.end(error ? 'Read error' : data);
  });
}).listen(Number(process.env.PORT) || 4173, '127.0.0.1', function () {
  console.log(`Code secret : http://127.0.0.1:${this.address().port}`);
});
