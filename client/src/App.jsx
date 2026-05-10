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
    
    if (location.pathname === '/admin') {
      manifestLink.href = 'manifest-admin.json';
    } else {
      manifestLink.href = 'manifest.webmanifest'; 
    }
  }, [location]);

  return null;
}

function App() {
  useEffect(() => {
    notificationService.init();
  }, []);

  return (
    <HashRouter>
      <PWAManifestManager />
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