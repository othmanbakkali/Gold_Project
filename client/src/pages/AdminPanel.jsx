import { useState, useEffect } from 'react';
import { Save, Lock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { translations } from '../translations';

const SERVER_URL = 'http://localhost:3001';

export default function AdminPanel() {
  const [price, setPrice] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState('fr');
  const t = translations[lang].admin;

  // Fetch current price to populate form
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/api/price`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.price) {
            setPrice(data.price.toString());
          }
        }
      } catch (err) {
        console.error('Erreur lors de la récupération du prix actuel:', err);
      }
    };
    fetchPrice();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`${SERVER_URL}/api/price`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price: parseFloat(price),
          password: password,
          currency: 'MAD', // Hardcoded to MAD
          unit: 'g'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({
          type: 'success',
          message: t.success
        });
        // Clear password for security, keep price
        setPassword('');
      } else {
        setStatus({
          type: 'error',
          message: data.error || 'Erreur lors de la mise à jour'
        });
      }
    } catch (err) {
      setStatus({
        type: 'error',
        message: t.connError
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="admin-card" style={{ position: 'relative' }}>
        
        {/* Language switcher */}
        <div style={{ position: 'absolute', top: '1.5rem', right: lang === 'ar' ? 'auto' : '1.5rem', left: lang === 'ar' ? '1.5rem' : 'auto' }}>
          <select 
            value={lang} 
            onChange={(e) => setLang(e.target.value)}
            style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', outline: 'none' }}
          >
            <option value="fr" style={{color: '#000'}}>FR</option>
            <option value="en" style={{color: '#000'}}>EN</option>
            <option value="ar" style={{color: '#000'}}>AR</option>
          </select>
        </div>

        <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> {t.backToTv}
        </Link>
        <h1>{t.title}</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="price">{t.priceLabel}</label>
            <input
              type="number"
              id="price"
              step="0.01"
              min="0"
              required
              className="form-input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={t.pricePlaceholder}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t.passwordLabel}</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                id="password"
                required
                className="form-input"
                style={{ paddingLeft: '3rem', paddingRight: lang === 'ar' ? '3rem' : '1rem' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading}
          >
            {loading ? t.submitting : (
              <>
                <Save size={20} />
                {t.submitBtn}
              </>
            )}
          </button>
        </form>

        {status.message && (
          <div className={`status-message status-${status.type}`}>
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
}
