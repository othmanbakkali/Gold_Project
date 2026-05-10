import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';
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
const analytics = getAnalytics(app);

export const notificationService = {
  async init() {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FirebaseMessaging.requestPermissions();
        if (result.receive === 'granted') {
          await this.register();
        }
      } catch (err) {
        console.error('Error initializing native notifications:', err);
      }
    } else {
      // WEB PUSH SUPPORT (FCM)
      try {
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            await this.registerWebPush();
          }
        }
      } catch (err) {
        console.error('Error initializing web notifications:', err);
      }
    }
  },

  async registerWebPush() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const messaging = getMessaging(app);
      
      // Get FCM Token for Web using our PWA Service Worker
      const token = await getToken(messaging, {
        vapidKey: 'BHTMyej4PBdPj7UgOPNK90mnIh11mZPLkmy18L67KyVrj9X6z4Y7TaupzARAuepnzufIAVJpywbBagGSpGUPjUQ',
        serviceWorkerRegistration: registration
      });

      if (token) {
        console.log('Web FCM Token:', token);
        await this.sendTokenToServer(token, 'web');
      }
    } catch (err) {
      console.error('Error registering Web Push:', err);
    }
  },

  async register() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const result = await FirebaseMessaging.getToken();
      if (result.token) {
        await this.sendTokenToServer(result.token, 'android');
      }
      if (!this.tokenListenerAdded) {
        FirebaseMessaging.addListener('tokenReceived', (event) => {
          this.sendTokenToServer(event.token, 'android');
        });
        this.tokenListenerAdded = true;
      }
    } catch (err) {
      console.error('Error registering native notifications:', err);
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
      if (!response.ok) throw new Error('Failed to register token on server');
      console.log(`Token registered successfully for ${platform} (${lang})`);
    } catch (err) {
      console.error('Error sending token to server:', err);
    }
  }
};
