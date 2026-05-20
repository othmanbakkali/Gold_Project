import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import HomePage from './pages/HomePage';
import TVDisplay from './pages/TVDisplay';
import PriceChart from './pages/PriceChart';
import { Capacitor } from '@capacitor/core';
import { notificationService } from './services/notificationService';
import './pages/HomePage.css';

/**
 * Hook to keep the screen awake and periodically refresh the page
 * to prevent the device from going into sleep mode.
 */
function useKeepAwake() {
  useEffect(() => {
    let wakeLock = null;

    const requestWakeLock = async () => {
      // Only request if supported and page is visible
      if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        try {
          // Check if already acquired
          if (wakeLock) return;

          wakeLock = await navigator.wakeLock.request('screen');
          console.log('Screen Wake Lock acquired');
          
          wakeLock.addEventListener('release', () => {
            console.log('Screen Wake Lock released');
            wakeLock = null; // Reset to allow re-acquisition
          });
        } catch (err) {
          // Ignore error if page is not visible as it's a browser restriction
          if (document.visibilityState !== 'visible') return;
          console.warn(`Wake Lock Warning: ${err.name}, ${err.message}`);
        }
      }
    };

    // Request wake lock on mount
    requestWakeLock();

    // Re-acquire wake lock when page becomes visible
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic refresh every 14 minutes (just before the 15min timeout mentioned by user)
    const refreshTimer = setTimeout(() => {
      console.log('Performing scheduled refresh to prevent sleep...');
      window.location.reload();
    }, 14 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(refreshTimer);
      if (wakeLock) wakeLock.release();
    };
  }, []);
}

function PWAManifestManager() {
  const location = useLocation();

  useEffect(() => {
    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    
    // In HashRouter, location.pathname is the part after the #
    if (location.pathname === '/admin') {
      manifestLink.href = '/manifest-admin.json';
    } else {
      manifestLink.href = '/manifest.webmanifest'; 
    }
  }, [location]);

  return null;
}

function RedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If we are on mobile and the App ID is the Admin one, redirect to /admin
    if (Capacitor.isNativePlatform()) {
      // Logic for mobile redirection could go here
    }
  }, []);

  return null;
}

function App() {
  useKeepAwake();

  useEffect(() => {
    notificationService.init();
  }, []);

  return (
    <HashRouter>
      <PWAManifestManager />
      <RedirectHandler />
      <Routes>
        <Route path="/"      element={<HomePage />} />
        <Route path="/TV"    element={<TVDisplay />} />
        <Route path="/chart" element={<PriceChart />} />
      </Routes>
    </HashRouter>
  );
}

export default App;