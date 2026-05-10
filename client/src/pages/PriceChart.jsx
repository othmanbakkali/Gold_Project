import { useState, useEffect } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';
import { ArrowLeft, Calendar, TrendingUp, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { translations } from '../translations';

const SOCKET_SERVER_URL = 'https://goldprojectbackend-production.up.railway.app';
const HISTORY_KEY = 'gold_price_history';

// ─── Helpers ────────────────────────────────────────────────────────────────

function loadLocalHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

function saveLocalHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (_) {}
}

function addEntryIfNew(history, newEntry) {
  // Avoid duplicates: skip if same price at same minute
  const last = history[history.length - 1];
  if (last && last.price === newEntry.price && last.date.slice(0, 16) === newEntry.date.slice(0, 16)) {
    return history;
  }
  return [...history, newEntry];
}

function filterByPeriod(history, period) {
  const now = new Date();
  const cutoff = new Date(now);
  if (period === '3days') {
    cutoff.setDate(cutoff.getDate() - 3);
  } else if (period === 'week') {
    cutoff.setDate(cutoff.getDate() - 7);
  } else if (period === 'month') {
    cutoff.setMonth(cutoff.getMonth() - 1);
  } else if (period === '3months') {
    cutoff.setMonth(cutoff.getMonth() - 3);
  }
  return history.filter(e => new Date(e.date) >= cutoff);
}

function formatDate(dateStr, period) {
  try {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    
    if (period === 'month' || period === '3months') {
      return `${yy}/${mm}/${dd}`;
    }
    return `${dd}/${mm} ${hh}:${min}`;
  } catch (_) {
    return dateStr;
  }
}

// ─── Seed données historiques ────────────────────────────────────────────────

function seedHistoricalData() {
  let history = loadLocalHistory();
  const seed = [
    { price: 1145, date: '2026-04-30T12:00:00.000Z' },
    { price: 1150, date: '2026-05-01T12:00:00.000Z' },
    { price: 1138, date: '2026-05-02T12:00:00.000Z' },
  ];
  let changed = false;
  for (const entry of seed) {
    const exists = history.some(h => h.date === entry.date && h.price === entry.price);
    if (!exists) {
      history = addEntryIfNew(history, entry);
      changed = true;
    }
  }
  if (changed) saveLocalHistory(history);
  return history;
}

// ─── Composant ───────────────────────────────────────────────────────────────

export default function PriceChart() {
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('ar');
  const [history, setHistory] = useState([]);
  const t = translations[lang].tv;

  // Fetch history from server
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${SOCKET_SERVER_URL}/api/price/history?period=month`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0) {
          // Normaliser les dates reçues du serveur
          const normalized = data.map(entry => {
            let dateStr = entry.date;
            if (typeof dateStr === 'string' && dateStr.includes(' ') && !dateStr.includes('T')) {
              dateStr = dateStr.replace(' ', 'T') + 'Z';
            }
            return { ...entry, price: parseFloat(entry.price), date: dateStr };
          });
          
          setHistory(prev => {
            // Fusionner avec le localStorage (optionnel)
            const local = loadLocalHistory();
            let combined = [...normalized];
            
            // Ajouter les entrées locales qui ne sont pas sur le serveur
            local.forEach(l => {
              if (!combined.some(c => c.date === l.date)) {
                combined.push(l);
              }
            });
            
            combined.sort((a, b) => new Date(a.date) - new Date(b.date));
            saveLocalHistory(combined);
            return combined;
          });
        }
      } catch (err) {
        console.error('Erreur fetch history:', err);
        // Fallback sur le seed + local si le serveur échoue
        const h = seedHistoricalData();
        setHistory(h);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // Fetch current price separately and add it to history if new
  useEffect(() => {
    const fetchCurrent = async () => {
      try {
        const res = await fetch(`${SOCKET_SERVER_URL}/api/price`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data.price || !data.date) return;
        
        let dateStr = data.date;
        if (typeof dateStr === 'string' && dateStr.includes(' ') && !dateStr.includes('T')) {
          dateStr = dateStr.replace(' ', 'T') + 'Z';
        }
        
        setHistory(prev => {
          const updated = addEntryIfNew(prev, { price: parseFloat(data.price), date: dateStr });
          saveLocalHistory(updated);
          return updated;
        });
      } catch (_) {}
    };

    fetchCurrent();
  }, []);

  const filtered = filterByPeriod(history, period).map(e => ({
    ...e,
    formattedDate: formatDate(e.date, period),
    price: parseFloat(e.price),
  }));

  const minPrice = filtered.length > 0 ? Math.min(...filtered.map(d => d.price)) : 0;
  const maxPrice = filtered.length > 0 ? Math.max(...filtered.map(d => d.price)) : 0;
  const avgPrice = filtered.length > 0
    ? (filtered.reduce((s, d) => s + d.price, 0) / filtered.length).toFixed(2)
    : 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'rgba(31,40,51,0.97)',
          border: '1px solid var(--gold-primary)',
          borderRadius: '10px',
          padding: '10px 16px',
          color: 'var(--text-main)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          minWidth: '140px'
        }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '4px' }}>{label}</p>
          <p style={{ color: 'var(--gold-primary)', fontWeight: '800', fontSize: '1.3rem' }}>
            {payload[0].value.toFixed(2)} <span style={{ fontSize: '0.7em' }}>Dh/g</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="tv-container price-chart-page" style={{ padding: '1rem', height: 'auto', minHeight: '100vh' }} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="admin-card chart-card" style={{
        maxWidth: '1200px', 
        width: '100%', 
        minHeight: '85vh',
        display: 'flex', 
        flexDirection: 'column',
        background: 'rgba(11, 12, 16, 0.95)',
        border: '1px solid rgba(212, 175, 55, 0.2)',
        padding: 'clamp(1rem, 3vw, 2rem)',
        margin: '0 auto'
      }}>

        {/* ── Header ── */}
        <div className="chart-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1.2rem', 
          flexWrap: 'wrap', 
          gap: '1rem' 
        }}>
          <Link to="/TV" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <ArrowLeft size={18} /> {t.back}
          </Link>

          <div className="period-selector" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => setPeriod('3days')} className={period === '3days' ? 'btn-primary' : 'form-input'} style={{ padding: '0.4rem 0.6rem', width: 'auto', fontSize: '0.75rem' }}>
              {t.last3Days}
            </button>
            <button onClick={() => setPeriod('week')} className={period === 'week' ? 'btn-primary' : 'form-input'} style={{ padding: '0.4rem 0.6rem', width: 'auto', fontSize: '0.75rem' }}>
              {t.lastWeek}
            </button>
            <button onClick={() => setPeriod('month')} className={period === 'month' ? 'btn-primary' : 'form-input'} style={{ padding: '0.4rem 0.6rem', width: 'auto', fontSize: '0.75rem' }}>
              {t.lastMonth}
            </button>
            <button onClick={() => setPeriod('3months')} className={period === '3months' ? 'btn-primary' : 'form-input'} style={{ padding: '0.4rem 0.6rem', width: 'auto', fontSize: '0.75rem' }}>
              {t.last3Months}
            </button>
          </div>

          <select value={lang} onChange={e => setLang(e.target.value)}
            style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.2)', padding: '5px', borderRadius: '5px', fontSize: '0.8rem' }}>
            <option value="fr">FR</option>
            <option value="en">EN</option>
            <option value="ar">AR</option>
            <option value="es">ES</option>
          </select>
        </div>

        {/* ── Title ── */}
        <h1 style={{ color: 'var(--gold-primary)', textAlign: 'center', marginBottom: '1rem', fontSize: 'clamp(1.2rem, 4vw, 1.6rem)', fontWeight: '700' }}>
          <TrendingUp size={22} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
          {t.chartTitle}
        </h1>

        {/* ── Stats bar ── */}
        {filtered.length > 0 && (
          <div className="stats-bar" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 5px',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.8rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {lang === 'ar' ? 'السعر الحالي' : lang === 'en' ? 'Current price' : lang === 'es' ? 'Precio actual' : 'Prix actuel'}
              </span>
              <span style={{ color: '#10b981', fontWeight: '700', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingUp size={14} />
                {filtered[filtered.length - 1].price.toFixed(2)}
                <span style={{ fontSize: '0.65rem', color: '#10b981', opacity: 0.8 }}>Dh/g</span>
              </span>
            </div>

            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              {lang === 'ar' ? 'آخر تحديث: ' : lang === 'en' ? 'Last update: ' : lang === 'es' ? 'Última actualización: ' : 'Mise à jour : '}
              <span style={{ color: 'var(--gold-primary)', fontWeight: '600' }}>
                {filtered[filtered.length - 1].formattedDate}
              </span>
            </div>
          </div>
        )}

        {/* ── Chart ── */}
        <div style={{ height: 'calc(100vh - 200px)', minHeight: 350, width: '100%', position: 'relative' }}>
          {loading ? (
            <div className="loading-container" style={{ height: '100%' }}>
              <div className="spinner"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', opacity: 0.6 }}>
              <TrendingUp size={64} style={{ color: 'var(--gold-primary)' }} />
              <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                {lang === 'ar' ? 'لا توجد بيانات للفترة المحددة.' :
                 lang === 'en' ? 'No data for this period.' :
                 lang === 'es' ? 'Sin datos para este período.' :
                 'Aucune donnée pour cette période.'}
              </p>
            </div>
          ) : (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <AreaChart data={filtered} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--gold-primary)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--gold-primary)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="formattedDate"
                    stroke="var(--text-muted)"
                    tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                    reversed={lang === 'ar'}
                    interval="preserveStartEnd"
                    minTickGap={20}
                  />
                  <YAxis
                    stroke="var(--text-muted)"
                    domain={[minPrice - 5, maxPrice + 5]}
                    tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                    orientation={lang === 'ar' ? 'right' : 'left'}
                    tickFormatter={v => `${v}`}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine
                    y={parseFloat(avgPrice)}
                    stroke="rgba(212,175,55,0.2)"
                    strokeDasharray="5 5"
                  />
                  <Area
                    type="linear"
                    dataKey="price"
                    stroke="var(--gold-primary)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorPrice)"
                    dot={{ r: 2, fill: 'var(--gold-primary)', strokeWidth: 1 }}
                    activeDot={{ r: 6, fill: 'var(--gold-primary)', stroke: '#fff', strokeWidth: 2 }}
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="chart-footer" style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', opacity: 0.7 }}>
          <Calendar size={12} style={{ verticalAlign: 'middle', margin: '0 5px' }} />
          {period === 'week' ? t.lastWeek : t.lastMonth}
          {' · '}
          {lang === 'ar' ? 'البيانات مخزّنة محلياً' : lang === 'en' ? 'Data stored locally' : lang === 'es' ? 'Datos almacenados localmente' : 'Données stockées localement'}
        </div>
      </div>

      <footer className="global-footer">
        copyright &copy; 2026; <a href="https://sdbo.ma" target="_blank" rel="noreferrer">sdbo.ma</a>
      </footer>
    </div>
  );
}
