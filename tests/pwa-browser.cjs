// Optional browser verification. Requires Playwright + Chromium as development tools.
// No additional library is shipped to players.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { chromium } = require(process.env.CODE_SECRET_PLAYWRIGHT || 'playwright');
const root = path.join(__dirname, '..');
const out = path.join(root, 'test-results');
const origin = 'http://127.0.0.1:4175';
const base = `${origin}/Code-secret-Mastermind/`;
const publicURL = 'https://thomasmetzker24.github.io/Code-secret-Mastermind/#installer';
const server = spawn(process.execPath, ['server.cjs'], { cwd: root, env: { ...process.env, PORT: '4175' }, stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; console.log(`OK ${checks}: ${message}`); };

(async () => {
  await once(server.stdout, 'data');
  fs.mkdirSync(out, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.CODE_SECRET_BROWSER ? { executablePath: process.env.CODE_SECRET_BROWSER } : {}) });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  check((await page.locator('#offline-status').innerText()).includes('prêt'), 'première ouverture : mode hors ligne prêt');
  check(await page.locator('#install-app').isHidden() || (await page.locator('#install-status').innerText()).includes('Votre navigateur propose'), 'bouton natif uniquement après une invitation du navigateur');
  const manifestResponse = await page.request.get(`${base}manifest.webmanifest`);
  check(manifestResponse.headers()['content-type'].includes('application/manifest+json'), 'manifest servi avec son type MIME');
  const manifest = await manifestResponse.json();
  check(manifest.name === 'Code secret' && manifest.display === 'standalone', 'nom personnalisé et affichage autonome');
  check(new URL(manifest.scope, `${base}manifest.webmanifest`).href === base, 'portée limitée au sous-dossier du jeu');
  for (const icon of manifest.icons) {
    const response = await page.request.get(new URL(icon.src, `${base}manifest.webmanifest`).href);
    const png = await response.body();
    const [width, height] = icon.sizes.split('x').map(Number);
    check(response.ok() && png.readUInt32BE(16) === width && png.readUInt32BE(20) === height, `icône ${icon.purpose} ${icon.sizes} disponible`);
  }
  check(await page.locator('.install-qr a').first().getAttribute('href') === publicURL, 'le guide et le QR visent la même adresse publique');
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    check(dimensions.content <= dimensions.viewport, `aucun débordement horizontal à ${width}px`);
    await page.locator('#installer').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, `pwa-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.evaluate(() => {
    window.__prompts = 0;
    const event = new Event('beforeinstallprompt', { cancelable: true });
    event.prompt = async () => { window.__prompts++; };
    event.userChoice = Promise.resolve({ outcome: 'dismissed' });
    window.dispatchEvent(event);
  });
  check(await page.locator('#install-app').isVisible(), 'bouton proposé quand beforeinstallprompt est reçu (simulation)');
  await page.locator('#install-app').click();
  check(await page.evaluate(() => window.__prompts === 1) && (await page.locator('#install-status').innerText()).includes('annulée'), 'annulation de l’installation : retour clair, jeu accessible (simulation)');
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  check((await page.locator('#install-status').innerText()).includes('installé') && await page.locator('#install-app').isHidden(), 'confirmation d’installation masque le bouton (simulation)');
  check(await page.evaluate(() => !window.codeSecretTest), 'API absente en mode normal');

  await context.setOffline(true);
  await page.reload();
  check((await page.locator('#board-title').innerText()).includes('jouer'), 'rechargement complet du jeu sans réseau');
  for (const color of ['rouge', 'bleu', 'vert', 'jaune']) await page.getByRole('button', { name: `${color}, touche`, exact: false }).click();
  await page.locator('#submit').click();
  check(await page.locator('.played').count() === 1 && (await page.locator('#attempt-count').innerText()) === '1 sur 10', 'une proposition, des indices et un historique fonctionnent hors ligne');
  check((await page.locator('.played .hint').getAttribute('aria-label')).includes('mal placées'), 'indices conservés hors ligne');
  await context.setOffline(false);

  const testPage = await context.newPage();
  await testPage.goto(`${base}?test=1`);
  await testPage.waitForFunction(() => window.codeSecretTest);
  check(await testPage.evaluate(() => window.codeSecretTest.getState().status === 'not-started'), 'mode test initial inchangé même après activation du service worker');
  check((await testPage.locator('#offline-status').innerText()).includes('Mode test'), 'mode test sans invitation ni enregistrement hors ligne');
  await testPage.close();

  const clean = await browser.newContext();
  const integration = await clean.newPage();
  await integration.goto(`${base}tests/browser.html`);
  await integration.locator('#run').click();
  await integration.waitForFunction(() => document.getElementById('summary').textContent.includes('10 vérifications réussies'));
  check((await integration.locator('#summary').innerText()).includes('0 échec'), 'les dix vérifications historiques de l’API et de l’interface passent');
  check(await integration.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length === 0), 'les iframes de test n’enregistrent aucun service worker');
  await clean.close();

  check(errors.length === 0, `aucune erreur JavaScript (${errors.join('; ')})`);
  await context.close();
  console.log(`${checks} contrôles PWA réussis. Captures : test-results/pwa-375.png et pwa-1280.png`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  server.kill();
});
