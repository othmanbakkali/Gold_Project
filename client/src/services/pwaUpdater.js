/**
 * PWA Auto-Updater
 * Détecte et applique automatiquement les nouvelles versions du frontend (PWA / Mobile Web)
 * dès qu'un nouveau build est déployé sur le serveur.
 */
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = 'https://goldprojectbackend-production.up.railway.app';
const UPDATE_CHECK_INTERVAL_MS = 60 * 1000; // Vérification toutes les 60 secondes

let isRefreshing = false;

export function initPwaAutoUpdate() {
  if (typeof window === 'undefined') return;

  // ── 1. Rechargement automatique en cas d'erreur de chargement de chunk (Vite) ──
  // Si un nouveau build a remplacé les anciens fichiers .js sur le serveur,
  // cette écoute intercepte l'erreur 404 et recharge immédiatement le nouveau frontend.
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    console.warn('[PWA] Chunk manquant suite à un déploiement. Rechargement immédiat...');
    triggerReload();
  });

  // ── 2. Gestion du Service Worker ───────────────────────────────────────────
  if ('serviceWorker' in navigator) {
    // Quand le nouveau Service Worker prend le contrôle (après skipWaiting),
    // on recharge automatiquement la page pour afficher le nouveau front.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 [PWA] Nouveau Service Worker activé : application mise à jour !');
      triggerReload();
    });

    // Attendre que le Service Worker soit prêt
    navigator.serviceWorker.ready.then((registration) => {
      console.log('[PWA] Service Worker prêt. Surveillance des mises à jour activée.');

      // Vérification immédiate au démarrage
      checkForUpdate(registration);

      // A. Vérification périodique toutes les minutes
      setInterval(() => {
        checkForUpdate(registration);
      }, UPDATE_CHECK_INTERVAL_MS);

      // B. Vérification dès que l'écran se rallume ou que l'onglet redevient actif
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          checkForUpdate(registration);
        }
      });

      window.addEventListener('focus', () => {
        checkForUpdate(registration);
      });

      // C. Vérification lors du retour de la connexion réseau
      window.addEventListener('online', () => {
        checkForUpdate(registration);
      });

      // D. Détecter si un nouveau Service Worker commence à s'installer
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        console.log('[PWA] Téléchargement d\'une nouvelle mise à jour en cours...');

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // Il y a déjà un ancien SW en cours, le nouveau est installé : activer immédiatement
              console.log('[PWA] Nouvelle version prête. Forçage de l\'activation (skipWaiting)...');
              installingWorker.postMessage({ type: 'SKIP_WAITING' });
            } else {
              console.log('[PWA] Premier chargement hors-ligne configuré avec succès.');
            }
          }
        });
      });
    }).catch((err) => {
      console.warn('[PWA] Erreur serviceWorker.ready:', err);
    });

    // ── 3. Surveillance en temps réel via Socket.IO ──────────────────────────
    try {
      const socket = io(SOCKET_SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        reconnectionDelay: 2000
      });

      // Dès qu'on se reconnecte au serveur, vérifier si le front a changé
      socket.on('connect', () => {
        triggerSwUpdate();
      });

      // Notification en direct émise par le backend lors d'un nouveau déploiement
      socket.on('frontend_update', () => {
        console.log('[PWA] Signal "frontend_update" reçu en direct via Socket.IO.');
        triggerSwUpdate();
      });

      socket.on('app_update_available', () => {
        triggerSwUpdate();
      });
    } catch (e) {
      console.warn('[PWA] Socket.IO auto-update listener non disponible:', e.message);
    }
  }
}

/**
 * Lance la vérification des mises à jour auprès du serveur
 */
function checkForUpdate(registration) {
  if (!registration) return;
  registration.update().catch((err) => {
    // Normal en cas de perte temporaire de réseau
    console.debug('[PWA] Vérification MàJ ignorée (réseau indisponible)');
  });
}

/**
 * Déclenche une vérification sur tous les Service Workers enregistrés
 */
export function triggerSwUpdate() {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        checkForUpdate(reg);
      }
    }).catch(() => {});
  }
}

/**
 * Recharge la page en douceur pour appliquer le nouveau code
 */
function triggerReload() {
  if (isRefreshing) return;
  isRefreshing = true;

  // Afficher un petit indicateur visuel discret si l'interface est chargée
  showUpdateToast();

  setTimeout(() => {
    window.location.reload();
  }, 400);
}

/**
 * Petit toast d'actualisation fluide
 */
function showUpdateToast() {
  try {
    const existing = document.getElementById('pwa-update-toast');
    if (existing) return;

    const toast = document.createElement('div');
    toast.id = 'pwa-update-toast';
    toast.innerHTML = `
      <div style="
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #1f2833 0%, #0b0f19 100%);
        border: 1.5px solid #d4af37;
        box-shadow: 0 8px 30px rgba(0,0,0,0.6), 0 0 20px rgba(212,175,55,0.3);
        color: #f8fafc;
        padding: 10px 20px;
        border-radius: 50px;
        font-size: 0.9rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 9999999;
        animation: pwaToastIn 0.3s ease-out;
      ">
        <span style="display:inline-block; animation: pwaSpin 1s infinite linear;">⚡</span>
        <span>Mise à jour de l'application... / جاري التحديث...</span>
      </div>
      <style>
        @keyframes pwaToastIn {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes pwaSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      </style>
    `;
    document.body.appendChild(toast);
  } catch (e) {
    // Ignorer si le DOM n'est pas encore prêt
  }
}
