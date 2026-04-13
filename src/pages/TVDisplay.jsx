import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Download } from 'lucide-react';
import { translations } from '../translations';

const SOCKET_SERVER_URL = 'https://goldprojectbackend-production.up.railway.app/';

export default function TVDisplay() {
  const [priceData, setPriceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('fr'); // 'fr', 'en', 'ar'
  const t = translations[lang].tv;
  const [error, setError] = useState(null);
  const priceCardRef = useRef(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prévenir l'affichage automatique du prompt Chrome (optionnel, mais recommandé pour personnaliser)
      e.preventDefault();
      // Sauvegarder l'événement pour pouvoir le déclencher plus tard
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Afficher le prompt
      deferredPrompt.prompt();
      // Attendre la réponse de l'utilisateur
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`Résultat de l'installation: ${outcome}`);
      // L'événement ne peut être utilisé qu'une seule fois
      setDeferredPrompt(null);
    }
  };

  // Auto-rotate language every 10 seconds
  useEffect(() => {
    const langs = ['fr', 'en', 'ar'];
    const intervalId = setInterval(() => {
      setLang(currentLang => {
        const currentIndex = langs.indexOf(currentLang);
        return langs[(currentIndex + 1) % langs.length];
      });
    }, 10000);
    return () => clearInterval(intervalId);
  }, []);
  useEffect(() => {
    // 1. Initial fetch via REST API
    const fetchInitialPrice = async () => {
      try {
        const response = await fetch(`${SOCKET_SERVER_URL}/api/price`);
        if (!response.ok) throw new Error(t.networkError);
        const data = await response.json();
        setPriceData(data);
      } catch (err) {
        console.error('Erreur de récupération initiale:', err);
        setError(t.reconnecting);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialPrice();

    // 2. Setup Socket.IO subscription
    const socket = io(SOCKET_SERVER_URL);

    socket.on('connect', () => {
      console.log('Connecté au serveur Socket.io');
      setError(null);
    });

    socket.on('connect_error', () => {
      setError(t.disconnected);
    });

    socket.on('priceUpdate', (newData) => {
      console.log('Nouveau prix reçu:', newData);
      setPriceData(newData);
      
      // Trigger animation
      if (priceCardRef.current) {
        // Remove animation class if it exists to allow re-triggering
        priceCardRef.current.classList.remove('price-update-glow');
        
        // Force a reflow to restart animation
        void priceCardRef.current.offsetWidth;
        
        // Add animation class
        priceCardRef.current.classList.add('price-update-glow');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>{t.connecting}</p>
      </div>
    );
  }

  return (
    <div className="tv-container" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Language switcher */}
      <div style={{ position: 'absolute', top: '1rem', right: lang === 'ar' ? 'auto' : '1rem', left: lang === 'ar' ? '1rem' : 'auto', zIndex: 10 }}>
        <select 
          value={lang} 
          onChange={(e) => setLang(e.target.value)}
          style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.2)', padding: '5px', borderRadius: '5px', cursor: 'pointer' }}
        >
          <option value="fr" style={{color: '#000'}}>Français</option>
          <option value="en" style={{color: '#000'}}>English</option>
          <option value="ar" style={{color: '#000'}}>العربية</option>
        </select>
        
        {deferredPrompt && (
          <button 
            onClick={handleInstallClick}
            style={{ 
              marginLeft: '1rem', 
              background: 'rgba(251, 191, 36, 0.2)', 
              color: 'var(--gold-primary)', 
              border: '1px solid var(--gold-primary)', 
              padding: '6px 12px', 
              borderRadius: '5px', 
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem'
            }}
          >
            <Download size={16} /> Installer l'App
          </button>
        )}
      </div>

      {error && <div style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</div>}
      
      <img src="/logo.png?v=2" alt="Logo Association" style={{ height: '140px', marginBottom: '1rem', objectFit: 'contain' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <img src="/flag.png?v=2" alt="Moroccan Flag" className="flag-wave" style={{ height: '40px', width: '40px', objectFit: 'contain' }} />
        <h1 className="tv-title" style={{ margin: 0 }}>{t.title}</h1>
        <img src="/flag.png?v=2" alt="Moroccan Flag" className="flag-wave" style={{ height: '40px', width: '40px', objectFit: 'contain' }} />
      </div>
      
      <div className="price-card" ref={priceCardRef}>
        <div className="price-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
          <div className="currency-unit" style={{ fontSize: '3rem', color: 'var(--text-main)', fontWeight: '500', opacity: 0.9, letterSpacing: '2px' }}>
            {t.pricePrefix}
          </div>
          <div className="gold-price" style={{ fontSize: '8rem', lineHeight: '1', margin: '0 0 -1rem 0' }}>
            {priceData?.price ? Math.floor(priceData.price) : '0'}
          </div>
          <div className="currency-unit" style={{ fontSize: '2.5rem', color: 'var(--gold-primary)', marginTop: '1rem' }} dangerouslySetInnerHTML={{ __html: t.priceSuffix }} />
        </div>
      </div>
      
      <div className="last-updated">
        {t.updatedAt} {priceData?.date ? new Date(priceData.date).toLocaleTimeString(lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-US' : 'fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) : '...'}
      </div>
    </div>
  );
}
