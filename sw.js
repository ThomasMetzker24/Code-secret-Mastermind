'use strict';
const CACHE_PREFIX = `code-secret:${self.registration.scope}:`;
const CACHE_NAME = `${CACHE_PREFIX}1.1.0`;
const FILES = [
  './index.html', './style.css', './game.js', './app.js', './pwa.js',
  './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png',
  './icons/icon-512.png', './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png', './assets/code-secret-qr.png', './assets/code-secret-qr.svg'
];
const assetURLs = new Set(FILES.map(file => new URL(file, self.registration.scope).href));
const indexURL = new URL('./index.html', self.registration.scope).href;
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(FILES.map(file => new Request(new URL(file, self.registration.scope), { cache: 'reload' })));
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin ||
      !url.href.startsWith(self.registration.scope) || url.searchParams.has('test') ||
      url.pathname.startsWith(new URL('./tests/', self.registration.scope).pathname)) return;
  const isGamePage = event.request.mode === 'navigate' &&
    [new URL('./', self.registration.scope).pathname, new URL('./index.html', self.registration.scope).pathname].includes(url.pathname);
  if (!isGamePage && !assetURLs.has(url.href)) return;
  // Cache one complete version. A waiting update is activated only on request.
  event.respondWith((async () => {
    const client = event.clientId ? await self.clients.get(event.clientId) : null;
    if (client) {
      const clientURL = new URL(client.url);
      if (clientURL.searchParams.has('test') || clientURL.pathname.startsWith(new URL('./tests/', self.registration.scope).pathname)) {
        return fetch(event.request);
      }
    }
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(isGamePage ? indexURL : event.request)) || fetch(event.request);
  })());
});
