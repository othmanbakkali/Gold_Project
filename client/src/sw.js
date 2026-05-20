self.addEventListener('install', (event) => {
  // Force le SW à s'installer immédiatement sans attendre les anciens SW
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  // Prend le contrôle de tous les clients dès l'activation
  event.waitUntil(self.clients.claim());
});

precacheAndRoute(self.__WB_MANIFEST);

// ── Nom du cache pour les données de prix ─────────────────────────────────────
const PRICE_CACHE_NAME = 'prix-or-api-cache-v1';

// ── Au démarrage : mettre en cache /api/price depuis le réseau ────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.open(PRICE_CACHE_NAME).then(async (cache) => {
      try {
        const response = await fetch('/api/price');
        if (response.ok) {
          await cache.put('/api/price', response);
          console.log('[sw.js] Cache initial /api/price effectué.');
        }
      } catch (err) {
        console.warn('[sw.js] Impossible de pré-cacher /api/price:', err.message);
      }
    })
  );
});

// ── Intercepter les requêtes /api/price : Network-first, fallback cache ───────
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/price') && !event.request.url.includes('/api/price/history')) {
    event.respondWith(
      fetch(event.request.clone())
        .then(async (networkResponse) => {
          if (networkResponse.ok) {
            const cache = await caches.open(PRICE_CACHE_NAME);
            await cache.put('/api/price', networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(async () => {
          console.warn('[sw.js] Réseau indisponible, utilisation du cache /api/price');
          const cached = await caches.match('/api/price');
          return cached || new Response(JSON.stringify({ error: 'Hors ligne' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }
});

// ── Réception des mises à jour de prix depuis l'app (Socket.IO) ──────────────
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'CACHE_PRICE_UPDATE') {
    const priceData = event.data.payload;
    try {
      const cache = await caches.open(PRICE_CACHE_NAME);
      const response = new Response(JSON.stringify(priceData), {
        headers: { 'Content-Type': 'application/json' }
      });
      await cache.put('/api/price', response);
      console.log('[sw.js] Cache /api/price mis à jour avec le nouveau prix:', priceData.price);
    } catch (err) {
      console.error('[sw.js] Erreur lors de la mise à jour du cache:', err.message);
    }
  }
});

// Scripts Firebase pour le Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBNdUTT7RdHKM1B3KHt9zWDpNkt7iZ_mKA",
  authDomain: "goldproject-f4e0e.firebaseapp.com",
  projectId: "goldproject-f4e0e",
  storageBucket: "goldproject-f4e0e.firebasestorage.app",
  messagingSenderId: "77898368295",
  appId: "1:77898368295:web:65f938df7f33f01d169502"
});

const messaging = firebase.messaging();

// Gérer les messages en arrière-plan
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Message reçu en arrière-plan:', payload);
  const title = payload.notification?.title || '🥇 تحديث سعر الذهب';
  const options = {
    body: payload.notification?.body || 'سعر جديد متوفر الآن',
    icon: '/icon.png',
    badge: '/favicon.svg',
    data: payload.data,
    vibrate: [200, 100, 200],
    tag: 'price-update',
    renotify: true
  };
  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

