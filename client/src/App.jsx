import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import HomePage from './pages/HomePage';
import TVDisplay from './pages/TVDisplay';
import AdminPanel from './pages/AdminPanel';
import PriceChart from './pages/PriceChart';
import { Capacitor } from '@capacitor/core';
import { notificationService } from './services/notificationService';
import './pages/HomePage.css';

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
      // In a real app, we would use App.getInfo() but we can check a global or meta
      // For now, let's assume we can use a window variable set in index.html or just detect it
      // Alternatively, we can check the URL if we set it in capacitor.config
    }
  }, []);

  return null;
}

function App() {
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
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/chart" element={<PriceChart />} />
      </Routes>
    </HashRouter>
  );
}

export default App;