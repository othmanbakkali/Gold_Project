import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging';

const SERVER_URL = 'https://goldprojectbackend-production.up.railway.app';
const VAPID_KEY = 'BHTMyej4PBdPj7UgOPNK90mnIh11mZPLkmy18L67KyVrj9X6z4Y7TaupzARAuepnzufIAVJpywbBagGSpGUPjUQ';

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
let messaging = null;

if (typeof window !== 'undefined' && 'Notification' in window) {
  try {
    messaging = getMessaging(app);
    // Foreground message listener
    onMessage(messaging, (payload) => {
      console.log('Message reçu en premier plan:', payload);
      if (Notification.permission === 'granted') {
        const title = payload.notification?.title || '🥇 Prix Or Maroc';
        const options = {
          body: payload.notification?.body || 'Mise à jour disponible',
          icon: '/icon.png',
          badge: '/favicon.svg',
          data: payload.data,
          vibrate: [200, 100, 200]
        };
        new Notification(title, options);
      }
    });
  } catch (e) {
    console.warn('Firebase Messaging non supporté ou non initialisé:', e.message);
  }
}

export const notificationService = {
  tokenListenerAdded: false,

  /**
   * Initialisation silencieuse au démarrage de l'app.
   * ATTENTION : Ne jamais déclencher de prompt Notification.requestPermission()
   * ici car iOS Safari bloque les demandes sans clic utilisateur !
   */
  async init() {
    if (localStorage.getItem('notifications_enabled') === 'false') {
      console.log('Initialisation annulée : notifications désactivées localement.');
      return false;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await FirebaseMessaging.checkPermissions();
        if (perm.receive === 'granted') {
          return await this.register();
        }
      } catch (err) {
        console.warn('Erreur vérification permission native:', err.message);
      }
    } else {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          return await this.registerWebPush();
        }
      }
    }
    return false;
  },

  /**
   * Déclenché UNIQUEMENT sur un clic / geste de l'utilisateur.
   * Obligatoire pour iOS Safari et les navigateurs mobiles modernes.
   */
  async requestPermissionAndRegister() {
    const isIOS = typeof navigator !== 'undefined' && (
      /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
    const isStandalone = typeof window !== 'undefined' && (
      window.navigator.standalone === true || 
      window.matchMedia('(display-mode: standalone)').matches
    );

    // Sur iOS, les Web Push exigent impérativement d'être en mode PWA (sur l'écran d'accueil)
    if (isIOS && !Capacitor.isNativePlatform() && !isStandalone) {
      return { 
        success: false, 
        reason: 'ios_not_standalone',
        message: 'Sur iPhone, vous devez d\'abord ajouter l\'application à l\'écran d\'accueil (Partager ⎋ -> Sur l\'écran d\'accueil) pour activer les notifications.'
      };
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FirebaseMessaging.requestPermissions();
        if (result.receive === 'granted') {
          const registered = await this.register();
          localStorage.setItem('notifications_enabled', 'true');
          return { success: registered };
        } else {
          return { success: false, reason: 'permission_denied' };
        }
      } catch (err) {
        console.error('Erreur demande permission native:', err);
        return { success: false, reason: 'error', error: err.message };
      }
    } else {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        return { success: false, reason: 'not_supported' };
      }

      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          localStorage.setItem('notifications_enabled', 'true');
          const registered = await this.registerWebPush();
          return { success: registered };
        } else {
          return { success: false, reason: 'permission_denied' };
        }
      } catch (err) {
        console.error('Erreur demande permission web:', err);
        return { success: false, reason: 'error', error: err.message };
      }
    }
  },

  async registerWebPush() {
    try {
      if (!messaging) {
        messaging = getMessaging(app);
      }

      let registration = null;
      if ('serviceWorker' in navigator) {
        try {
          registration = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
          ]);
        } catch (e) {
          registration = await navigator.serviceWorker.getRegistration();
        }

        if (!registration) {
          registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        }
      }

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (token) {
        console.log('Web FCM Token obtenu avec succès:', token.slice(0, 15) + '...');
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const platform = isIOS ? 'ios' : 'web';
        await this.sendTokenToServer(token, platform);
        localStorage.setItem('notifications_enabled', 'true');
        return true;
      } else {
        console.warn('Aucun token Web FCM obtenu.');
        return false;
      }
    } catch (err) {
      console.error('Erreur lors de l\'obtention du token Web Push:', err);
      return false;
    }
  },

  async register() {
    if (localStorage.getItem('notifications_enabled') === 'false') {
      return false;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FirebaseMessaging.getToken();
        const platform = Capacitor.getPlatform(); // 'ios' ou 'android'
        if (result && result.token) {
          await this.sendTokenToServer(result.token, platform);
          localStorage.setItem('notifications_enabled', 'true');
        }

        if (!this.tokenListenerAdded) {
          FirebaseMessaging.addListener('tokenReceived', (event) => {
            if (event && event.token) {
              this.sendTokenToServer(event.token, platform);
            }
          });
          this.tokenListenerAdded = true;
        }
        return true;
      } catch (err) {
        console.error('Erreur enregistrement natif:', err);
        return false;
      }
    } else {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
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
      console.log(`✅ Token enregistré sur le serveur (${platform}, ${lang})`);
    } catch (err) {
      console.warn('Erreur envoi token au serveur:', err.message);
    }
  },

  async isPermissionGranted() {
    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await FirebaseMessaging.checkPermissions();
        return perm.receive === 'granted';
      } catch (err) {
        return false;
      }
    } else {
      return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
    }
  },

  async disable() {
    console.log('Désactivation des notifications...');
    localStorage.setItem('notifications_enabled', 'false');

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FirebaseMessaging.getToken();
        if (result && result.token) {
          await this.removeTokenFromServer(result.token);
        }
        await FirebaseMessaging.deleteToken();
      } catch (err) {
        console.error('Erreur désactivation native:', err);
      }
    } else {
      try {
        if (messaging) {
          const registration = await navigator.serviceWorker.ready;
          const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
          });
          if (token) {
            await this.removeTokenFromServer(token);
            await deleteToken(messaging);
          }
        }
      } catch (err) {
        console.error('Erreur désactivation web:', err);
      }
    }
  },

  async removeTokenFromServer(token) {
    try {
      await fetch(`${SERVER_URL}/api/fcm/unregister`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      console.log('Token supprimé du serveur');
    } catch (err) {
      console.warn('Erreur suppression token du serveur:', err.message);
    }
  }
};
