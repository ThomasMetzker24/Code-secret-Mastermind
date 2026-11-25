'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const scope = 'https://example.test/Code-secret-Mastermind/';
const prefix = `code-secret:${scope}:`;
const cacheName = `${prefix}1.1.0`;

function worker() {
  const handlers = {}, stores = new Map(), network = [], clients = new Map();
  let skips = 0, claims = 0;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        async addAll(requests) { for (const request of requests) entries.set(request.url, `cached:${request.url}`); },
        async match(request) { return entries.get(typeof request === 'string' ? request : request.url); }
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(key) { return stores.delete(key); }
  };
  const self = {
    registration: { scope }, location: { origin: 'https://example.test' },
    addEventListener(type, fn) { handlers[type] = fn; },
    clients: { async claim() { claims++; }, async get(id) { return clients.get(id); } },
    async skipWaiting() { skips++; }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8'), {
    self, caches, URL, Request, fetch: async request => { network.push(request.url); return `network:${request.url}`; }
  });
  async function lifecycle(type, data) {
    let pending;
    handlers[type]({ data, waitUntil(promise) { pending = promise; } });
    await pending;
  }
  async function fetchFile(file, { method = 'GET', mode = 'cors', clientId = '' } = {}) {
    let result;
    handlers.fetch({ request: { url: new URL(file, scope).href, method, mode }, clientId, respondWith(promise) { result = promise; } });
    return result;
  }
  return { lifecycle, fetchFile, stores, network, clients, get skips(){return skips;}, get claims(){return claims;} };
}
test('SW : précache du jeu complet et nettoyage limité au même projet', async () => {
  const w=worker(); w.stores.set('another-project',new Map());w.stores.set(`${prefix}old`,new Map());
  await w.lifecycle('install');
  assert.ok(w.stores.get(cacheName).has(`${scope}index.html`));
  assert.ok(w.stores.get(cacheName).has(`${scope}assets/code-secret-qr.png`));
  assert.equal(w.skips,0);
  await w.lifecycle('activate');
  assert.equal(w.stores.has(`${prefix}old`),false);assert.equal(w.stores.has('another-project'),true);assert.equal(w.claims,1);
});
test('SW : démarrage et ressources disponibles sans appel réseau', async () => {
  const w=worker();await w.lifecycle('install');
  assert.equal(await w.fetchFile('./',{mode:'navigate'}),`cached:${scope}index.html`);
  assert.equal(await w.fetchFile('./style.css'),`cached:${scope}style.css`);
  assert.deepEqual(w.network,[]);
});
test('SW : tests, autre origine, autres projets et mutations ne sont pas interceptés', async () => {
  const w=worker();
  for (const file of ['./?test=1','./tests/browser.html','https://other.test/style.css','/other-project/','./unknown.html']) assert.equal(await w.fetchFile(file,{mode:'navigate'}),undefined);
  assert.equal(await w.fetchFile('./app.js',{method:'POST'}),undefined);
  w.clients.set('test',{url:`${scope}?test=1`});
  assert.equal(await w.fetchFile('./app.js',{clientId:'test'}),`network:${scope}app.js`);
});
test('SW : une mise à jour ne force l’activation que sur demande explicite', async () => {
  const w=worker();await w.lifecycle('install');assert.equal(w.skips,0);
  await w.lifecycle('message',{type:'unknown'});assert.equal(w.skips,0);
  await w.lifecycle('message',{type:'ACTIVATE_UPDATE'});assert.equal(w.skips,1);
});
