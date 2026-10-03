import { precacheAndRoute } from 'workbox-precaching';

// ── Cycle de vie du Service Worker ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Pré-cache des assets générés par Vite
precacheAndRoute(self.__WB_MANIFEST || []);

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

// ── Réception des messages depuis l'application ─────────────────────────────
self.addEventListener('message', async (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data.type === 'CACHE_PRICE_UPDATE') {
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

// ── Gestion native des notifications Push (FCM / Web Push) ────────────────────
self.addEventListener('push', (event) => {
  console.log('[sw.js] Push event reçu');
  let title = '🥇 تحديث سعر الذهب';
  let body = 'سعر جديد متوفر الآن';
  let data = {};

  if (event.data) {
    try {
      const json = event.data.json();
      const notification = json.notification || json.data || json;
      title = notification.title || title;
      body = notification.body || notification.message || body;
      data = json;
    } catch (e) {
      body = event.data.text() || body;
    }
  }

  const options = {
    body: body,
    icon: '/icon.png',
    badge: '/favicon.svg',
    data: data,
    vibrate: [200, 100, 200],
    tag: 'price-update',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
