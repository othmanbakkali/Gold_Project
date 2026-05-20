import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging';
import { getAnalytics } from "firebase/analytics";

const SERVER_URL = 'https://goldprojectbackend-production.up.railway.app';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBNdUTT7RdHKM1B3KHt9zWDpNkt7iZ_mKA",
  authDomain: "goldproject-f4e0e.firebaseapp.com",
  projectId: "goldproject-f4e0e",
  storageBucket: "goldproject-f4e0e.firebasestorage.app",
  messagingSenderId: "77898368295",
  appId: "1:77898368295:web:65f938df7f33f01d169502",
  measurementId: "G-MG1D54VB9F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Foreground message listener
onMessage(messaging, (payload) => {
  console.log('Message reçu en premier plan:', payload);
  if ('Notification' in window && Notification.permission === 'granted') {
    const title = payload.notification?.title || '🥇 Prix Or Maroc';
    const options = {
      body: payload.notification?.body || 'Mise à jour disponible',
      icon: '/icon.png',
      badge: '/favicon.svg',
      data: payload.data
    };
    new Notification(title, options);
  }
});

export const notificationService = {
  async init() {
    if (localStorage.getItem('notifications_enabled') === 'false') {
      console.log('Initialisation annulée car les notifications sont désactivées localement.');
      return false;
    }
    console.log('Initialisation des notifications...');
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FirebaseMessaging.requestPermissions();
        if (result.receive === 'granted') {
          return await this.register();
        }
      } catch (err) {
        console.error('Erreur initialisation native:', err);
        return false;
      }
    } else {
      try {
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          console.log('Permission notification:', permission);
          if (permission === 'granted') {
            return await this.registerWebPush();
          } else {
            //alert("Veuillez autoriser les notifications dans les réglages de votre navigateur.");
            return false;
          }
        } else {
          console.warn("Ce navigateur ne supporte pas les notifications.");
          return false;
        }
      } catch (err) {
        console.error('Erreur initialisation web:', err);
        return false;
      }
    }
  },

  async registerWebPush() {
    try {
      console.log('Enregistrement Web Push...');
      const registration = await navigator.serviceWorker.ready;

      const token = await getToken(messaging, {
        vapidKey: 'BHTMyej4PBdPj7UgOPNK90mnIh11mZPLkmy18L67KyVrj9X6z4Y7TaupzARAuepnzufIAVJpywbBagGSpGUPjUQ',
        serviceWorkerRegistration: registration
      });

      if (token) {
        console.log('Web FCM Token obtenu:', token);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const platform = isIOS ? 'ios' : 'web';
        await this.sendTokenToServer(token, platform);
        localStorage.setItem('notifications_enabled', 'true');
        return true;
      } else {
        console.warn('Aucun token obtenu.');
        return false;
      }
    } catch (err) {
      console.error('Erreur lors de l\'obtention du token Web Push:', err);
      if (err.code === 'messaging/permission-blocked') {
        alert("Les notifications sont bloquées par votre navigateur. Veuillez les réactiver dans les paramètres du site.");
      }
      return false;
    }
  },

  async register() {
    if (localStorage.getItem('notifications_enabled') === 'false') {
      console.log('Enregistrement annulé car les notifications sont désactivées localement.');
      return false;
    }
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FirebaseMessaging.getToken();
        const platform = Capacitor.getPlatform(); // 'ios' or 'android'
        if (result.token) {
          await this.sendTokenToServer(result.token, platform);
          localStorage.setItem('notifications_enabled', 'true');
        }
        if (!this.tokenListenerAdded) {
          FirebaseMessaging.addListener('tokenReceived', (event) => {
            this.sendTokenToServer(event.token, platform);
          });
          this.tokenListenerAdded = true;
        }
        return true;
      } catch (err) {
        console.error('Erreur enregistrement natif:', err);
        return false;
      }
    } else {
      if ('Notification' in window && Notification.permission === 'granted') {
        return await this.registerWebPush();
      }
      return false;
    }
  },

  async sendTokenToServer(token, platform) {
    try {
      const lang = localStorage.getItem('hp_lang') || 'ar';
      const response = await fetch(`${SERVER_URL}/api/fcm/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          platform: platform,
          lang: lang
        }),
      });
      if (!response.ok) throw new Error('Échec de l\'enregistrement sur le serveur');
      console.log(`Token enregistré avec succès pour ${platform} (${lang})`);
    } catch (err) {
      console.error('Erreur envoi token au serveur:', err);
    }
  },

  async isPermissionGranted() {
    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await FirebaseMessaging.checkPermissions();
        return perm.receive === 'granted';
      } catch (err) {
        console.error('Erreur checkPermissions:', err);
        return false;
      }
    } else {
      return 'Notification' in window && Notification.permission === 'granted';
    }
  },

  async disable() {
    console.log('Désactivation des notifications...');
    localStorage.setItem('notifications_enabled', 'false');
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FirebaseMessaging.getToken();
        if (result.token) {
          await this.removeTokenFromServer(result.token);
        }
        await FirebaseMessaging.deleteToken();
        console.log('Token natif supprimé');
      } catch (err) {
        console.error('Erreur désactivation native:', err);
      }
    } else {
      try {
        const registration = await navigator.serviceWorker.ready;
        const token = await getToken(messaging, {
          vapidKey: 'BHTMyej4PBdPj7UgOPNK90mnIh11mZPLkmy18L67KyVrj9X6z4Y7TaupzARAuepnzufIAVJpywbBagGSpGUPjUQ',
          serviceWorkerRegistration: registration
        });
        if (token) {
          await this.removeTokenFromServer(token);
          await deleteToken(messaging);
          console.log('Token Web Push supprimé');
        }
      } catch (err) {
        console.error('Erreur désactivation web:', err);
      }
    }
  },

  async removeTokenFromServer(token) {
    try {
      const response = await fetch(`${SERVER_URL}/api/fcm/unregister`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) throw new Error('Échec de la désinscription sur le serveur');
      console.log('Token désinscrit avec succès du serveur');
    } catch (err) {
      console.error('Erreur suppression token du serveur:', err);
    }
  }
};
