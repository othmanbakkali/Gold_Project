import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST);

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

