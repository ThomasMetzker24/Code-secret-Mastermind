'use strict';
(() => {
  const button = document.getElementById('install-app');
  const status = document.getElementById('install-status');
  const offlineStatus = document.getElementById('offline-status');
  const updateNotice = document.getElementById('update-notice');
  const updateButton = document.getElementById('update-app');
  const standalone = window.matchMedia('(display-mode: standalone)');
  let promptEvent = null;
  let waitingWorker = null;
  let reloadingForUpdate = false;
  let offlineReady = false;
  const testMode = new URLSearchParams(window.location.search).get('test') === '1' || window.self !== window.top;

  function installed() {
    return standalone.matches || window.navigator.standalone === true;
  }
  function showInstalled() {
    promptEvent = null;
    button.hidden = true;
    status.textContent = 'Code secret est ouvert comme application. Bon jeu !';
  }
  function showNetwork() {
    offlineStatus.textContent = !navigator.onLine
      ? (offlineReady ? 'Vous êtes hors connexion. Le jeu reste disponible sur cet appareil.' : 'Vous êtes hors connexion. La préparation du jeu hors ligne nécessite une première connexion.')
      : offlineReady ? 'Le jeu est prêt à fonctionner hors connexion sur cet appareil.' : '';
  }
  if (installed()) showInstalled();
  standalone.addEventListener('change', () => { if (installed()) showInstalled(); });
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    if (testMode || installed()) return;
    promptEvent = event;
    button.hidden = false;
    status.textContent = 'Votre navigateur propose l’installation : touchez « Installer Code secret ».';
  });
  window.addEventListener('appinstalled', () => {
    promptEvent = null;
    button.hidden = true;
    status.textContent = 'Code secret est installé. Retrouvez son icône parmi vos applications.';
  });
  button.addEventListener('click', async () => {
    if (!promptEvent) return;
    const currentPrompt = promptEvent;
    promptEvent = null;
    button.hidden = true;
    try {
      await currentPrompt.prompt();
      const choice = await currentPrompt.userChoice;
      status.textContent = choice.outcome === 'accepted'
        ? 'Demande d’installation acceptée. Votre navigateur termine l’installation.'
        : 'Installation annulée. Vous pouvez continuer à jouer ici ou utiliser le menu du navigateur.';
    } catch {
      status.textContent = 'Utilisez le menu de votre navigateur pour installer le jeu, en suivant le guide ci-dessous.';
    }
  });
  window.addEventListener('online', showNetwork);
  window.addEventListener('offline', showNetwork);

  // Never register or cache a teacher's test session, an iframe or a file:// page.
  if (testMode) {
    offlineStatus.textContent = 'Mode test : la préparation hors ligne et les invitations d’installation sont désactivées.';
    return;
  }
  if (!['https:', 'http:'].includes(window.location.protocol) || !window.isSecureContext || !('serviceWorker' in navigator)) {
    offlineStatus.textContent = 'Pour installer le jeu et préparer le mode hors ligne, ouvrez son adresse publique HTTPS dans un navigateur compatible.';
    return;
  }
  function offerUpdate(registration) {
    waitingWorker = registration.waiting;
    if (waitingWorker && navigator.serviceWorker.controller) updateNotice.hidden = false;
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Activating the first worker must not reset a game in progress.
    if (reloadingForUpdate) window.location.reload();
  });
  updateButton.addEventListener('click', () => {
    if (!waitingWorker) return;
    reloadingForUpdate = true;
    updateButton.disabled = true;
    waitingWorker.postMessage({ type: 'ACTIVATE_UPDATE' });
  });
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' });
      offerUpdate(registration);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed') offerUpdate(registration);
        });
      });
      await navigator.serviceWorker.ready;
      offlineReady = true;
      showNetwork();
    } catch {
      offlineStatus.textContent = 'Le mode hors ligne n’a pas pu être préparé. Vous pouvez continuer à jouer en ligne et réessayer à la prochaine ouverture.';
    }
  });
})();
