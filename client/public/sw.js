// Service Worker for Gold Project
// Implements simple caching for API calls and offline fallback.
// No external Workbox dependency.

importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

workbox.core.setCacheNameDetails({ prefix: 'goldproject', suffix: 'v1' });

const CACHE_NAME = 'goldproject-v1';
const API_CACHE = 'goldproject-api';
const OFFLINE_FALLBACK = '/offline.html';

self.addEventListener('install', (event) => {
  // Precache offline fallback page (if exists) and static assets.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        OFFLINE_FALLBACK,
        // Add other static assets as needed, e.g., '/', '/index.html', '/static/js/...'
      ]).catch((e) => console.warn('SW install cache add error', e));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clean up old caches.
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME && name !== API_CACHE)
          .map((old) => caches.delete(old))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // NetworkFirst strategy for API calls.
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Clone and store in API cache.
          const clone = networkResponse.clone();
          caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          return networkResponse;
        })
        .catch(() => {
          // Return cached response if network fails.
          return caches.match(request);
        })
    );
    return;
  }

  // For navigation requests, serve offline fallback on failure.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_FALLBACK))
    );
    return;
  }

  // Default: try cache, then network.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  const { type, payload } = event.data;
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  // Update price cache when server notifies client.
  if (type === 'CACHE_PRICE_UPDATE' && payload) {
    // Store the price payload as JSON in the API cache for the /api/price endpoint.
    const cacheKey = new Request(`${self.location.origin}/api/price`);
    const response = new Response(JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json' }
    });
    caches.open(API_CACHE).then((cache) => cache.put(cacheKey, response))
      .then(() => console.log('💾 Price cache refreshed via message'))
      .catch((e) => console.error('Cache update error', e));
  }
});
