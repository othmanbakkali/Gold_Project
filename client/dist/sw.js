// Service Worker minimal pour permettre l'installation PWA
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
});

self.addEventListener('fetch', (event) => {
  // Optionnel : mettre en cache les ressources ici
  // Actuellement, un écouteur fetch vide suffit pour valider la PWA dans Chromium
});
