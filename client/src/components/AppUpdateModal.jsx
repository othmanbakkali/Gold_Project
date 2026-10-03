import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { io } from 'socket.io-client';
import { Smartphone, Download, RefreshCw, AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react';
import { APP_VERSION, APP_VERSION_CODE, compareVersions } from '../version';
import './AppUpdateModal.css';

const SOCKET_SERVER_URL = 'https://goldprojectbackend-production.up.railway.app';
const API_URL = `${SOCKET_SERVER_URL}/api/app-version`;
const SNOOZE_KEY = 'prixor_update_snooze_';

export default function AppUpdateModal() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem('hp_lang') || 'ar');

  const isNative = Capacitor.isNativePlatform();
  const isMobile = isNative || (typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));

  // Sync language with localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const currentLang = localStorage.getItem('hp_lang') || 'ar';
      setLang(currentLang);
    };
    window.addEventListener('storage', handleStorageChange);
    // Poll briefly in case language toggles inside the same window
    const interval = setInterval(handleStorageChange, 2000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Check version against backend
  const evaluateVersion = (config) => {
    if (!config) return;

    const remoteCode = parseInt(config.versionCode, 10) || 0;
    const remoteVersion = config.version || '1.0.0';
    const isOutdated = remoteCode > APP_VERSION_CODE || compareVersions(remoteVersion, APP_VERSION) > 0;
    const isForceUpdate = config.forceUpdate || (config.minVersionCode && APP_VERSION_CODE < parseInt(config.minVersionCode, 10));

    if (isOutdated) {
      // Check snooze only if not a forced update
      if (!isForceUpdate) {
        const snoozedUntil = localStorage.getItem(`${SNOOZE_KEY}${remoteVersion}`);
        if (snoozedUntil && Date.now() < parseInt(snoozedUntil, 10)) {
          console.log(`[Update] Version ${remoteVersion} snoozée jusqu'à:`, new Date(parseInt(snoozedUntil, 10)));
          return;
        }
      }
      setUpdateInfo({
        ...config,
        isForceUpdate
      });
      setIsOpen(true);
    }
  };

  useEffect(() => {
    // 1. Initial check on mount
    const checkVersion = async () => {
      try {
        const res = await fetch(API_URL, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          evaluateVersion(data);
        }
      } catch (err) {
        console.warn('[Update] Erreur lors de la vérification de version:', err.message);
      }
    };

    checkVersion();

    // 2. Real-time updates via Socket.IO
    const socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socket.on('app_update_available', (config) => {
      console.log('[Update] Notification de mise à jour reçue en direct via Socket:', config);
      evaluateVersion(config);
    });

    // 3. Periodic check every 30 minutes
    const periodicTimer = setInterval(checkVersion, 30 * 60 * 1000);

    return () => {
      socket.disconnect();
      clearInterval(periodicTimer);
    };
  }, []);

  if (!isOpen || !updateInfo) return null;

  const isRtl = lang === 'ar';
  const remoteVersion = updateInfo.version || '1.2.0';
  const apkUrl = updateInfo.apkUrl || `${SOCKET_SERVER_URL}/PrixOr.apk`;

  const handleUpdateClick = () => {
    if (isNative) {
      setDownloading(true);
      // Open APK download in system browser / download manager
      window.location.href = apkUrl;
      // Also open via standard fallback
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = apkUrl;
        link.setAttribute('download', 'PrixOr.apk');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, 500);
    } else {
      // Mobile Web / PWA: Refresh cache & reload
      setDownloading(true);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.update();
          }
        });
      }
      setTimeout(() => {
        window.location.reload(true);
      }, 800);
    }
  };

  const handleSnooze = () => {
    if (updateInfo.isForceUpdate) return;
    // Snooze for 12 hours
    const twelveHoursLater = Date.now() + 12 * 60 * 60 * 1000;
    localStorage.setItem(`${SNOOZE_KEY}${remoteVersion}`, twelveHoursLater.toString());
    setIsOpen(false);
  };

  // Content localized
  const title = lang === 'ar' 
    ? (updateInfo.titleAr || 'تحديث جديد متوفر للتطبيق')
    : (updateInfo.titleFr || 'Nouvelle mise à jour disponible');

  const message = lang === 'ar'
    ? (updateInfo.messageAr || 'يتوفر إصدار جديد من تطبيق سعر الذهب. يرجى التحديث للاستفادة من أحدث المميزات ودقة الأسعار المباشرة.')
    : (updateInfo.messageFr || 'Une nouvelle version de PrixOr est disponible. Veuillez mettre à jour l\'application pour profiter des dernières améliorations.');

  const notes = lang === 'ar'
    ? (updateInfo.notesAr || '• تحسين سرعة التطبيق واستقرار الإشعارات\n• دقة الأسعار وتحديثات فورية')
    : (updateInfo.notesFr || '• Améliorations de performance et stabilité\n• Nouvelles fonctionnalités et prix en temps réel');

  return (
    <div className="app-update-overlay" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="app-update-card">
        {/* Badge Icon */}
        <div className="app-update-badge-container">
          <div className="app-update-icon-wrapper">
            <Smartphone size={36} />
            <div className="app-update-pulse-beacon" />
          </div>
        </div>

        {/* Title area */}
        <div className="app-update-title-area">
          <div className="app-update-pill">
            <Sparkles size={14} />
            <span>{lang === 'ar' ? 'إصدار جديد' : 'NOUVELLE VERSION'}</span>
          </div>
          <h2 className="app-update-title">{title}</h2>
          <div className="app-update-versions-badge">
            <span>v{APP_VERSION}</span>
            <span className="arrow">➔</span>
            <span className="new-v">v{remoteVersion}</span>
          </div>
        </div>

        {/* Message */}
        <p className="app-update-message">{message}</p>

        {/* Release Notes */}
        {notes && (
          <div className="app-update-notes-box">
            <div className="app-update-notes-title">
              <CheckCircle2 size={16} />
              <span>{lang === 'ar' ? 'ما الجديد في هذا الإصدار :' : 'Nouveautés de cette version :'}</span>
            </div>
            <div className="app-update-notes-list">{notes}</div>
          </div>
        )}

        {/* Force Update Banner */}
        {updateInfo.isForceUpdate && (
          <div className="app-update-force-banner">
            <AlertTriangle size={18} />
            <span>
              {lang === 'ar' 
                ? 'هذا التحديث إجباري لمتابعة استخدام التطبيق.' 
                : 'Cette mise à jour est obligatoire pour continuer.'}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="app-update-actions">
          <button 
            type="button" 
            className="app-update-btn-primary"
            onClick={handleUpdateClick}
          >
            {isNative ? (
              <>
                <Download size={20} />
                <span>
                  {downloading
                    ? (lang === 'ar' ? 'جاري بدء التحميل...' : 'Téléchargement...')
                    : (lang === 'ar' ? 'تحميل وتثبيت التحديث (APK)' : 'Télécharger & Installer la MàJ')}
                </span>
              </>
            ) : (
              <>
                <RefreshCw size={20} className={downloading ? 'spin' : ''} />
                <span>
                  {downloading 
                    ? (lang === 'ar' ? 'جاري التحديث...' : 'Actualisation...')
                    : (lang === 'ar' ? 'تحديث التطبيق الآن' : 'Actualiser l\'application')}
                </span>
              </>
            )}
          </button>

          {!updateInfo.isForceUpdate && (
            <button
              type="button"
              className="app-update-btn-secondary"
              onClick={handleSnooze}
            >
              {lang === 'ar' ? 'تذكير لاحقاً' : 'Plus tard'}
            </button>
          )}
        </div>

        {/* Helper guide */}
        {isNative && (
          <div className="app-update-instruction">
            {lang === 'ar' ? (
              <>💡 <strong>ملاحظة:</strong> بعد اكتمال التحميل، اضغط على الملف في شريط الإشعارات لتثبيته.</>
            ) : (
              <>💡 <strong>Note :</strong> Une fois le téléchargement terminé, cliquez sur le fichier dans les notifications pour l'installer.</>
            )}
          </div>
        )}

        {!isNative && isMobile && (
          <div className="app-update-instruction">
            <a 
              href={apkUrl} 
              style={{ color: '#d4af37', textDecoration: 'underline' }}
              download="PrixOr.apk"
            >
              {lang === 'ar' 
                ? '📱 أو قم بتنزيل تطبيق أندرويد الرسمي (APK)' 
                : '📱 Ou téléchargez l\'application officielle Android (APK)'}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
