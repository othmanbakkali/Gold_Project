import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { Capacitor } from '@capacitor/core';

const SERVER_URL = 'https://goldprojectbackend-production.up.railway.app';

export const notificationService = {
  async init() {
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications are only available on native platforms.');
      return;
    }

    try {
      // 1. Request permissions
      const result = await FirebaseMessaging.requestPermissions();
      if (result.receive === 'granted') {
        // 2. Register for notifications
        await this.register();
      }

      // 3. Add listeners
      FirebaseMessaging.addListener('notificationReceived', (event) => {
        console.log('Notification received:', event);
      });

      FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
        console.log('Notification action performed:', event);
      });

    } catch (err) {
      console.error('Error initializing notifications:', err);
    }
  },

  async register() {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      // Get the FCM token
      const result = await FirebaseMessaging.getToken();
      const token = result.token;

      if (token) {
        console.log('FCM Token:', token);
        await this.sendTokenToServer(token);
      }

      // Listen for token refresh (only add listener once)
      if (!this.tokenListenerAdded) {
        FirebaseMessaging.addListener('tokenReceived', (event) => {
          this.sendTokenToServer(event.token);
        });
        this.tokenListenerAdded = true;
      }

    } catch (err) {
      console.error('Error registering notifications:', err);
    }
  },

  async sendTokenToServer(token) {
    try {
      // Get preferred language from localStorage
      const lang = localStorage.getItem('hp_lang') || 'ar';

      const response = await fetch(`${SERVER_URL}/api/fcm/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          platform: Capacitor.getPlatform(),
          lang: lang
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register token on server');
      }

      console.log(`FCM token registered successfully on server for lang: ${lang}`);
    } catch (err) {
      console.error('Error sending token to server:', err);
    }
  }
};
