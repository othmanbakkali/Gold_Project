import { HashRouter, Routes, Route, useLocation, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Volume2, VolumeX, AreaChart as ChartIcon, Maximize, Minimize } from 'lucide-react';
import { translations } from '../translations';
import logo from '../assets/logo.png';
import flag from '../assets/flag.png';
import bourse from '../assets/bourse.mp3';
import goldBars from '../assets/gold-bars.png';

const SOCKET_SERVER_URL = 'https://goldprojectbackend-production.up.railway.app';

const parseDate = (dateStr) => {
  if (!dateStr) return null;
  // Convertir le format SQL 'YYYY-MM-DD HH:MM:SS' en format ISO valide
  if (typeof dateStr === 'string' && dateStr.includes(' ') && !dateStr.includes('T')) {
    return new Date(dateStr.replace(' ', 'T') + 'Z');
  }
  return new Date(dateStr);
};

export default function TVDisplay() {
  const [priceData, setPriceData] = useState(null);
  const [recentPrices, setRecentPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('ar'); // 'fr', 'en', 'ar'
  const t = translations[lang].tv;
  const [error, setError] = useState(null);
  const priceCardRef = useRef(null);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAutoRotate, setIsAutoRotate] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Maintain local history and recent prices
  useEffect(() => {
    if (!priceData) return;
    try {
      const raw = localStorage.getItem('gold_price_history');
      let hist = raw ? JSON.parse(raw) : [];
      const last = hist[hist.length - 1];

      let dateStr = priceData.date;
      if (typeof dateStr === 'string' && dateStr.includes(' ') && !dateStr.includes('T')) {
        dateStr = dateStr.replace(' ', 'T') + 'Z';
      } else if (dateStr instanceof Date || typeof dateStr === 'object') {
        dateStr = new Date(dateStr).toISOString();
      } else {
        dateStr = new Date(dateStr).toISOString();
      }

      const newEntry = { price: parseFloat(priceData.price), date: dateStr };
      if (!last || parseFloat(last.price) !== newEntry.price || last.date.slice(0, 16) !== newEntry.date.slice(0, 16)) {
        hist = [...hist, newEntry];
        localStorage.setItem('gold_price_history', JSON.stringify(hist));
      }

      const previous = hist.filter(h => parseFloat(h.price) !== newEntry.price || h.date !== newEntry.date);
      setRecentPrices(previous.slice(-3));
    } catch (e) {
      console.error('Error updating history:', e);
    }
  }, [priceData]);

  // Try to play audio on mount. If blocked, it will gracefully fail and user can click button.
  useEffect(() => {
    if (audioRef.current) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.log("Audio autoplay was blocked. User must interact first.", err);
          setIsPlaying(false);
        });
      }
    }
  }, []);

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  // Auto-rotate language: 10s for FR/EN, 25s for AR
  useEffect(() => {
    if (!isAutoRotate) return;
    const langs = ['fr', 'en', 'ar', 'es'];
    const duration = lang === 'ar' ? 25000 : 10000;

    const timeoutId = setTimeout(() => {
      const currentIndex = langs.indexOf(lang);
      const nextLang = langs[(currentIndex + 1) % langs.length];
      setLang(nextLang);
    }, duration);

    return () => clearTimeout(timeoutId);
  }, [lang, isAutoRotate]);

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
    const socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'], // Prioritize websocket but allow polling
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

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

    const fallbackInterval = setInterval(fetchInitialPrice, 60000);

    return () => {
      socket.disconnect();
      clearInterval(fallbackInterval);
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
      {/* Background Music */}
      <audio ref={audioRef} loop src={bourse}>
        Votre navigateur ne prend pas en charge l'élément audio.
      </audio>

      {/* Language switcher */}
      <div style={{ position: 'absolute', top: '1rem', right: lang === 'ar' ? 'auto' : '1rem', left: lang === 'ar' ? '1rem' : 'auto', zIndex: 10 }}>
        <select
          value={lang}
          onChange={(e) => {
            setLang(e.target.value);
            setIsAutoRotate(false);
          }}
          style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.2)', padding: '5px', borderRadius: '5px', cursor: 'pointer' }}
        >
          <option value="fr" style={{ color: '#000' }}>Français</option>
          <option value="en" style={{ color: '#000' }}>English</option>
          <option value="ar" style={{ color: '#000' }}>العربية</option>
          <option value="es" style={{ color: '#000' }}>Español</option>
        </select>

        <button
          onClick={toggleAudio}
          title={isPlaying ? "Mute music" : "Play music"}
          style={{
            marginLeft: '1rem',
            background: isPlaying ? 'rgba(251, 191, 36, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: isPlaying ? 'var(--gold-primary)' : '#ef4444',
            border: `1px solid ${isPlaying ? 'var(--gold-primary)' : '#ef4444'}`,
            padding: '6px 12px',
            borderRadius: '5px',
            cursor: 'pointer',
            display: 'inline-flex',
            fontSize: '0.9rem'
          }}
        >
          <span style={{ marginRight: lang === 'ar' ? '0' : '0.5rem', marginLeft: lang === 'ar' ? '0.5rem' : '0' }}>
            {isPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </span>
          {isPlaying ? (lang === 'fr' ? 'Musique ON' : lang === 'en' ? 'Music ON' : 'موسيقى مفعلة') : (lang === 'fr' ? 'Musique OFF' : lang === 'en' ? 'Music OFF' : 'موسيقى معطلة')}
        </button>

        <Link
          to="/chart"
          style={{
            marginLeft: '1rem',
            background: 'rgba(212, 175, 55, 0.1)',
            color: 'var(--gold-primary)',
            border: '1px solid var(--gold-primary)',
            padding: '6px 12px',
            borderRadius: '5px',
            textDecoration: 'none',
            display: 'inline-flex',
            fontSize: '0.9rem'
          }}
        >
          <span style={{ marginRight: lang === 'ar' ? '0' : '0.5rem', marginLeft: lang === 'ar' ? '0.5rem' : '0' }}>
            <ChartIcon size={16} />
          </span>
          {t.viewChart}
        </Link>

        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
          style={{
            marginLeft: '1rem',
            background: 'rgba(212, 175, 55, 0.1)',
            color: 'var(--gold-primary)',
            border: '1px solid var(--gold-primary)',
            padding: '6px 12px',
            borderRadius: '5px',
            cursor: 'pointer',
            display: 'inline-flex',
            fontSize: '0.9rem'
          }}
        >
          <span style={{ marginRight: lang === 'ar' ? '0' : '0.5rem', marginLeft: lang === 'ar' ? '0.5rem' : '0' }}>
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </span>
          {isFullscreen ? (lang === 'fr' ? 'Réduire' : lang === 'en' ? 'Exit' : 'تصغير') : (lang === 'fr' ? 'Plein écran' : lang === 'en' ? 'Fullscreen' : 'ملء الشاشة')}
        </button>

        <span
          style={{
            marginLeft: '1rem',
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            border: '1px solid #ef4444',
            padding: '6px 12px',
            borderRadius: '5px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '1rem',
            fontWeight: 'bold'
          }}
        >
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            display: 'inline-block',
            boxShadow: '0 0 5px #ef4444'
          }}></span>
          بث التجريبي
        </span>
      </div>

      {error && <div style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</div>}

      <img src={logo} alt="Logo Association" className="logo-img" />

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <img src={flag} alt="Moroccan Flag" className="flag-wave flag-img" style={{ margin: '0 0.5rem' }} />
        <img src={goldBars} alt="Gold Bars" className="flag-wave flag-img" />
        <h1 className="tv-title">{t.title}</h1>
        <img src={goldBars} alt="Gold Bars" className="flag-wave flag-img" />
        <img src={flag} alt="Moroccan Flag" className="flag-wave flag-img" style={{ margin: '0 0.5rem' }} />
      </div>

      <div className="currency-unit">
        {t.pricePrefix}
      </div>

      <div className="price-card" ref={priceCardRef}>
        <div className="price-content">
          <div className="gold-price animate-service">
            <span className="price-currency prefix">
              {t.startingFrom}
            </span>
            {priceData?.price ? Math.floor(priceData.price) : "0"}
            <span className="price-currencycp suffix">
              {t.currency}
            </span>
          </div>
        </div>
      </div>

      {recentPrices.length > 0 && (
        <div className="recent-prices" style={{ marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '1.1rem', color: '#c5c6c7', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', opacity: 0.9, fontWeight: '500' }}>
          {recentPrices.map((p, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', margin: '0 0.5rem' }}>
              <strong style={{ color: 'var(--gold-primary)' }}>{p.price}</strong> <span style={{ fontSize: '0.8em' }}>{t.currency}</span>
              <span style={{ fontSize: '0.9em', opacity: 0.8 }}>
                {parseDate(p.date)?.toLocaleString(lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              {i < recentPrices.length - 1 && <span style={{ margin: '0 0.5rem', color: 'rgba(255,255,255,0.2)' }}>|</span>}
            </span>
          ))}
        </div>
      )}

      <div className="last-updated">
        {t.updatedAt} {priceData?.date ? parseDate(priceData.date)?.toLocaleString(lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) : '...'}
      </div>

      <div className="current-time" style={{ marginTop: '0.5rem', fontSize: '1.2rem', color: 'var(--gold-primary)', opacity: 0.8 }}>
        {lang === 'ar' ? 'الوقت الحالي' : lang === 'en' ? 'Current time' : lang === 'es' ? 'Hora actual' : 'Heure actuelle'} : {currentTime.toLocaleString(lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}
      </div>

      <footer className="global-footer" style={{ zIndex: 100 }}>
        copyright &copy; 2026; <a href="https://sdbo.ma" target="_blank" rel="noreferrer">sdbo.ma</a>
      </footer>

      {/* Decorative Gold Bars */}

    </div>
  );
}
