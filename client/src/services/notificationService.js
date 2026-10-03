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
        // 1. Créer impérativement le channel pour Android 8.0+
        await FirebaseMessaging.createChannel({
          id: 'gold_price_updates',
          name: "Alertes Prix de l'Or",
          description: "Notifications pour les mises à jour du prix de l'or",
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#D4AF37'
        }).catch(() => {});

        // 2. Sur Android natif, demander la permission dès l'ouverture
        const perm = await FirebaseMessaging.checkPermissions();
        if (perm.receive === 'granted') {
          return await this.register();
        } else {
          const req = await FirebaseMessaging.requestPermissions();
          if (req.receive === 'granted') {
            return await this.register();
          }
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
          return registered;
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
          return registered;
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
      if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
        return { success: false, reason: 'not_supported' };
      }

      if (!messaging) {
        messaging = getMessaging(app);
      }

      let registration = null;
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

      // Attendre que le SW soit actif s'il est en cours d'activation
      if (registration && !registration.active) {
        const sw = registration.installing || registration.waiting;
        if (sw) {
          await new Promise((resolve) => {
            sw.addEventListener('statechange', (e) => {
              if (e.target.state === 'activated') resolve();
            });
            setTimeout(resolve, 3000);
          });
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
        const serverSaved = await this.sendTokenToServer(token, platform);
        localStorage.setItem('notifications_enabled', 'true');
        return { success: true, token };
      } else {
        console.warn('Aucun token Web FCM obtenu.');
        return { success: false, reason: 'no_token', message: 'Impossible d\'obtenir le token FCM du navigateur.' };
      }
    } catch (err) {
      console.error('Erreur lors de l\'obtention du token Web Push:', err);
      return { success: false, reason: 'token_error', error: err.message };
    }
  },

  async register() {
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
        return { success: true };
      } catch (err) {
        console.error('Erreur enregistrement natif:', err);
        return { success: false, error: err.message };
      }
    } else {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        return await this.registerWebPush();
      }
      return { success: false, reason: 'not_granted' };
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
