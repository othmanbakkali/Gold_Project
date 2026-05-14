import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Home, TrendingUp, BarChart2, Archive, Newspaper, Info, Phone,
  Sun, Moon, Volume2, VolumeX,
  AreaChart as ChartIcon, Shield, Zap, Eye, Smartphone, Headphones, ShieldCheck,
  Menu, X, Bell
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine as RechartReferenceLine
} from 'recharts';
import icon from '../assets/Logo_min.png';
import logo from '../assets/logo.png';
import goldBars from '../assets/gold-bars.png';
import goldRings from '../assets/gold-rings-hero.png';
import bourse from '../assets/bourse.mp3';
import { translations } from '../translations';
import { notificationService } from '../services/notificationService';

const SOCKET_SERVER_URL = 'https://goldprojectbackend-production.up.railway.app';
const HISTORY_KEY = 'gold_price_history';

// ── Inline SVG social icons ───────────────────────────────────────────────────
const IconFacebook = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);
const IconInstagram = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);
const IconYoutube = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white" />
  </svg>
);

// ── Helpers (same as PriceChart) ──────────────────────────────────────────────
function loadLocalHistory() {
  try { const r = localStorage.getItem(HISTORY_KEY); if (r) return JSON.parse(r); } catch { }
  return [];
}
function saveLocalHistory(h) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch { }
}
function addEntryIfNew(history, entry) {
  const last = history[history.length - 1];
  if (last && last.price === entry.price && last.date.slice(0, 16) === entry.date.slice(0, 16)) return history;
  return [...history, entry];
}
function filterByPeriod(history, period) {
  const now = new Date();
  const cutoff = new Date(now);
  if (period === '3days') cutoff.setDate(cutoff.getDate() - 3);
  else if (period === 'week') cutoff.setDate(cutoff.getDate() - 7);
  else if (period === 'month') cutoff.setMonth(cutoff.getMonth() - 1);
  else if (period === '3months') cutoff.setMonth(cutoff.getMonth() - 3);
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
    if (period === 'month' || period === '3months') return `${yy}/${mm}/${dd}`;
    return `${dd}/${mm} ${hh}:${min}`;
  } catch { return dateStr; }
}
function seedHistoricalData() {
  let history = loadLocalHistory();
  const seed = [
    { price: 1145, date: '2026-04-30T12:00:00.000Z' },
    { price: 1150, date: '2026-05-01T12:00:00.000Z' },
    { price: 1138, date: '2026-05-02T12:00:00.000Z' },
  ];
  let changed = false;
  for (const entry of seed) {
    if (!history.some(h => h.date === entry.date && h.price === entry.price)) {
      history = addEntryIfNew(history, entry);
      changed = true;
    }
  }
  if (changed) saveLocalHistory(history);
  return history;
}
function normalizeDate(dateStr) {
  if (typeof dateStr === 'string' && dateStr.includes(' ') && !dateStr.includes('T'))
    return dateStr.replace(' ', 'T') + 'Z';
  return dateStr;
}

// ── Config ────────────────────────────────────────────────────────────────────
const KARAT_CONFIG = [
  { karat: 14, factor: 14 / 18, tKey: 'k14' },
  { karat: 21, factor: 21 / 18, tKey: 'k21' },
  { karat: 22, factor: 22 / 18, tKey: 'k22' },
  { karat: 18, factor: 1, tKey: 'k18', featured: true },
  { karat: 24, factor: 24 / 18, tKey: 'k24' },
];
const NAV_ITEMS = [
  { icon: Home, tKey: 'home', id: 'home' },
  { icon: TrendingUp, tKey: 'prices', id: 'prices' },
  { icon: BarChart2, tKey: 'chart', id: 'chart' },
  { icon: Shield, tKey: 'initiative', id: 'initiative' },
  { icon: Info, tKey: 'about', id: 'about' },
  { icon: Phone, tKey: 'contact', id: 'contact' },
];
const FEATURES_ICONS = [Shield, Zap, Eye, Smartphone, Headphones];
const PERIODS = [
  { key: '3days', tKey: 'days3' },
  { key: 'week', tKey: 'week' },
  { key: 'month', tKey: 'month' },
  { key: '3months', tKey: 'months3' },
];

const ABOUT_CONTENT = {
  ar: {
    p1: "الفيدرالية المغربية للصياغين هي إطار مهني يهدف إلى تمثيل والدفاع عن مصالح مهنيي قطاع الحلي والمجوهرات بالمغرب، سواء الحرفيين أو التجار أو المصنعين، والعمل على تنظيم القطاع وتطويره بما يواكب التحولات الاقتصادية والقانونية.",
    listTitle: "تسعى الفيدرالية إلى:",
    list: [
      "توحيد صوت المهنيين أمام المؤسسات الرسمية.",
      "الدفاع عن حقوق الصاغة والحرفيين.",
      "المساهمة في تنظيم المعاملات التجارية داخل القطاع.",
      "تشجيع احترام القوانين المنظمة للمهنة.",
      "دعم التكوين والتأطير المهني ومواكبة التطورات الحديثة.",
      "الحفاظ على الحرفة التقليدية المغربية وتثمينها."
    ],
    p2: "كما تعمل الفيدرالية على فتح قنوات الحوار مع الإدارات والمؤسسات المعنية، خصوصاً في ما يتعلق بالضرائب، المراقبة، الدمغ، الاستيراد، والتشريعات المرتبطة بالذهب والمجوهرات، إضافة إلى معالجة الإشكالات التي يعيشها القطاع على أرض الواقع.",
    p3: "وتلعب الفيدرالية أيضاً دوراً مهماً في تعزيز التضامن المهني بين الصاغة، وتشجيع المبادرات التي ترفع من قيمة المهنة وتحسن صورة القطاع لدى الرأي العام."
  },
  fr: {
    p1: "La Fédération Marocaine des Bijoutiers est un cadre professionnel visant à représenter et défendre les intérêts des professionnels du secteur de la bijouterie au Maroc, qu'il s'agisse d'artisans, de commerçants ou de fabricants, et à œuvrer pour l'organisation et le développement du secteur face aux mutations économiques et juridiques.",
    listTitle: "La Fédération vise à :",
    list: [
      "Unifier la voix des professionnels auprès des institutions officielles.",
      "Défendre les droits des bijoutiers et artisans.",
      "Contribuer à l'organisation des transactions commerciales dans le secteur.",
      "Encourager le respect des lois régissant la profession.",
      "Soutenir la formation et suivre les développements modernes.",
      "Préserver et valoriser l'artisanat traditionnel marocain."
    ],
    p2: "La Fédération ouvre également le dialogue avec les administrations concernées, notamment concernant la fiscalité, le contrôle, le poinçonnage, l'importation et la législation relative à l'or et aux bijoux, en plus de traiter les problèmes du secteur sur le terrain.",
    p3: "Elle joue un rôle important dans le renforcement de la solidarité professionnelle et l'encouragement d'initiatives valorisant la profession et améliorant l'image du secteur auprès du public."
  },
  en: {
    p1: "The Moroccan Federation of Jewelers is a professional framework aiming to represent and defend the interests of professionals in the jewelry sector in Morocco, whether artisans, merchants, or manufacturers, and to organize and develop the sector amid economic and legal transformations.",
    listTitle: "The Federation seeks to:",
    list: [
      "Unify the voice of professionals before official institutions.",
      "Defend the rights of jewelers and artisans.",
      "Contribute to organizing commercial transactions within the sector.",
      "Encourage respect for the laws governing the profession.",
      "Support professional training and keep up with modern developments.",
      "Preserve and promote traditional Moroccan craftsmanship."
    ],
    p2: "The Federation also opens dialogue channels with relevant administrations, particularly regarding taxation, control, hallmarking, import, and gold and jewelry legislation, in addition to addressing practical challenges faced by the sector.",
    p3: "It plays an important role in strengthening professional solidarity and encouraging initiatives that enhance the profession's value and improve the sector's public image."
  },
  es: {
    p1: "La Federación Marroquí de Joyeros es un marco profesional que tiene como objetivo representar y defender los intereses de los profesionales del sector de la joyería en Marruecos, ya sean artesanos, comerciantes o fabricantes, y organizar y desarrollar el sector ante las transformaciones económicas y legales.",
    listTitle: "La Federación busca:",
    list: [
      "Unificar la voz de los profesionales ante las instituciones oficiales.",
      "Defender los derechos de los joyeros y artesanos.",
      "Contribuir a la organización de las transacciones comerciales en el sector.",
      "Fomentar el respeto de las leyes que regulan la profesión.",
      "Apoyar la formación profesional y mantenerse al día con los desarrollos modernos.",
      "Preservar y poner en valor la artesanía tradicional marroquí."
    ],
    p2: "La Federación también abre canales de diálogo con las administraciones pertinentes, especialmente en lo que respecta a la fiscalidad, el control, el contraste, la importación y la legislación relacionada con el oro y la joyería, además de abordar los problemas prácticos del sector.",
    p3: "Desempeña un papel importante en el fortalecimiento de la solidaridad profesional y en el fomento de iniciativas que elevan el valor de la profesión y mejoran la imagen pública del sector."
  }
};

const INITIATIVE_CONTENT = {
  ar: {
    title: "مبادرة تعزيز الشفافية",
    p1: "في ظلّ التزايد اليومي في الطلب على معرفة سعر الذهب الخام عيار 18، جاءت هذه المبادرة بهدف تعزيز الشفافية داخل قطاع الحلي والمجوهرات، وتمكين المهنيين والمستهلكين من الاطلاع على السعر الحقيقي للذهب الخام، مع ربطه بالسعر المحلي المعتمد بالمغرب انطلاقًا من سوق الدار البيضاء باعتباره مرجعًا وطنيًا.",
    p2: "وتهدف هذه الفكرة إلى توفير مؤشر واضح وموحّد يساهم في تتبع تطور الأسعار، وتنظيم المعاملات داخل القطاع، وتعزيز الثقة بين مختلف المتدخلين.",
    p3: "وقد جاءت هذه المبادرة باقتراح و إعداد من السيد حكيم بنشعيب، عضو جمعية صوت الصاغة لطنجة الكبرى"
  },
  fr: {
    title: "Initiative de Transparence",
    p1: "Face à la demande quotidienne croissante pour connaître le prix de l'or brut 18 carats, cette initiative est née pour renforcer la transparence dans le secteur de la bijouterie, permettant aux professionnels et aux consommateurs de connaître le prix réel de l'or brut, lié au prix local agréé au Maroc à partir du marché de Casablanca comme référence nationale.",
    p2: "Cette idée vise à fournir un indicateur clair et unifié contribuant au suivi de l'évolution des prix, à l'organisation des transactions au sein du secteur et au renforcement de la confiance entre les différents intervenants.",
    p3: "Cette initiative a été proposée et préparée par M. Hakim Bencheid, membre de l'association Sawt As-Sagha de Tanger-Tétouan-Al Hoceïma."
  },
  en: {
    title: "Transparency Initiative",
    p1: "In light of the increasing daily demand for 18-karat raw gold prices, this initiative was launched to enhance transparency in the jewelry sector, enabling professionals and consumers to access the real price of raw gold, linked to the local price in Morocco based on the Casablanca market as a national reference.",
    p2: "The goal is to provide a clear and unified indicator that tracks price evolution, organizes transactions within the sector, and strengthens trust among stakeholders.",
    p3: "This initiative was proposed and prepared by Mr. Hakim Bencheid, member of the Sawt As-Sagha Association of Greater Tangier."
  },
  es: {
    title: "Iniciativa de Transparencia",
    p1: "Ante la creciente demanda diaria de precios del oro bruto de 18 quilates, esta iniciativa surgió para fortalecer la transparencia en el sector de la joyería, permitiendo a profesionales y consumidores conocer el precio real del oro bruto, vinculado al precio local en Marruecos basado en el mercado de Casablanca como referencia nacional.",
    p2: "El objetivo es proporcionar un indicador claro y unificado que siga la evolución de los precios, organice las transacciones en el sector y fortalezca la confianza entre los interesados.",
    p3: "Esta iniciativa fue propuesta y preparada por el Sr. Hakim Bencheid, miembro de la Asociación Sawt As-Sagha de Tánger."
  }
};

// ── Custom Tooltip (same as PriceChart) ───────────────────────────────────────
function GoldTooltip({ active, payload, label, lang, tCurrency }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(17,17,24,0.97)',
      border: '1px solid #D4AF37',
      borderRadius: 10,
      padding: '10px 16px',
      color: '#f0f0f0',
      boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
      minWidth: 140,
      direction: lang === 'ar' ? 'rtl' : 'ltr',
    }}>
      <p style={{ color: '#9a9ab0', fontSize: '0.78rem', marginBottom: 4 }}>{label}</p>
      <p style={{ color: '#D4AF37', fontWeight: 800, fontSize: '1.3rem' }}>
        {payload[0].value.toFixed(2)}{' '}
        <span style={{ fontSize: '0.7em' }}>{tCurrency}</span>
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [priceData, setPriceData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [activeNav, setActiveNav] = useState('home');
  const [isDark, setIsDark] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [chartPeriod, setChartPeriod] = useState('week');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [priceFlash, setPriceFlash] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lang, setLang] = useState(localStorage.getItem('hp_lang') || 'ar');
  const [showToast, setShowToast] = useState(false);
  const [toastData, setToastData] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const audioRef = useRef(null);

  const t = translations[lang] || translations['ar'];
  const hp_t = t.hp;
  const tNav = t.nav;
  const tPer = t.periods;
  const tFeat = t.features;
  const tKarats = t.karats;

  const cycleLang = () => {
    setLang(prev => {
      const next = prev === 'ar' ? 'fr' : prev === 'fr' ? 'en' : prev === 'en' ? 'es' : 'ar';
      localStorage.setItem('hp_lang', next);
      return next;
    });
  };

  // ── Clock ──
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);

    // Gérer l'installation PWA
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => clearInterval(t);
  }, []);

  // ── Re-register notifications on language change ──
  useEffect(() => {
    notificationService.register();
  }, [lang]);

  // ── Fetch history from server (same logic as PriceChart) ──
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${SOCKET_SERVER_URL}/api/price/history?period=month`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map(e => ({
            ...e,
            price: parseFloat(e.price),
            date: normalizeDate(e.date),
          }));
          setHistory(prev => {
            const local = loadLocalHistory();
            let combined = [...normalized];
            local.forEach(l => { if (!combined.some(c => c.date === l.date)) combined.push(l); });
            combined.sort((a, b) => new Date(a.date) - new Date(b.date));
            saveLocalHistory(combined);
            return combined;
          });
        }
      } catch {
        const h = seedHistoricalData();
        setHistory(h);
      } finally {
        setChartLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // ── Fetch current price + add to history ──
  useEffect(() => {
    const fetchCurrent = async () => {
      try {
        const res = await fetch(`${SOCKET_SERVER_URL}/api/price`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data.price) return;
        setPriceData(data);
        const dateStr = normalizeDate(data.date);
        setHistory(prev => {
          const updated = addEntryIfNew(prev, { price: parseFloat(data.price), date: dateStr });
          saveLocalHistory(updated);
          return updated;
        });
      } catch { }
      finally { setLoading(false); }
    };
    fetchCurrent();

    // ── Socket.IO live updates ──
    const socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
    });

    // Demander la permission au démarrage sur mobile/web
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    socket.on('priceUpdate', (data) => {
      setPriceData(data);
      setPriceFlash(true);

      // Toast Notification visuelle
      setToastData(data);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);

      // Système Notification (Web Push / Service Worker)
      if (Notification.permission === 'granted') {
        const title = lang === 'ar' ? '🥇 تحديث سعر الذهب' : '🥇 Prix de l\'Or à jour';
        const options = {
          body: `${Math.floor(data.price)} ${data.currency} / ${data.unit}`,
          icon: '/icon.png',
          badge: '/favicon.svg',
          vibrate: [200, 100, 200],
          tag: 'price-update',
          renotify: true
        };

        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, options);
          });
        } else {
          new Notification(title, options);
        }
      }

      setTimeout(() => setPriceFlash(false), 2500);
      const entry = { price: parseFloat(data.price), date: normalizeDate(data.date) };
      setHistory(prev => { const u = addEntryIfNew(prev, entry); saveLocalHistory(u); return u; });
    });
    return () => socket.disconnect();
  }, []);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play(); setIsPlaying(true); }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // ── Compute chart data (same as PriceChart) ──
  const filtered = filterByPeriod(history, chartPeriod).map(e => ({
    ...e,
    formattedDate: formatDate(e.date, chartPeriod),
    price: parseFloat(e.price),
  }));
  const minPrice = filtered.length > 0 ? Math.min(...filtered.map(d => d.price)) : 0;
  const maxPrice = filtered.length > 0 ? Math.max(...filtered.map(d => d.price)) : 0;
  const avgPrice = filtered.length > 0
    ? filtered.reduce((s, d) => s + d.price, 0) / filtered.length
    : 0;

  const basePrice = priceData?.price ? parseFloat(priceData.price) : 1085;
  const locale = lang === 'ar' ? 'ar-MA' : lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : 'en-US';
  const formattedDate = currentTime.toLocaleString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formattedClock = currentTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const priceDate = priceData?.date
    ? new Date(normalizeDate(priceData.date)).toLocaleString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '──';

  return (
    <div className="hp-root" dir="rtl" data-theme={isDark ? 'dark' : 'light'}>
      <audio ref={audioRef} loop src={bourse} />

      {/* ─── SIDEBAR ──────────────────────────────────────────── */}
      <aside className={`hp-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="hp-sidebar-logo">
          <img src={icon} alt="FMB Logo" />
          <span className="hp-sidebar-brand">الفدرالية المغربية للصياغين</span>
        </div>
        <nav className="hp-nav">
          {NAV_ITEMS.map(({ icon: Icon, tKey, id }) => (
            <button
              key={id}
              className={`hp-nav-item ${activeNav === id ? 'active' : ''}`}
              onClick={() => { setActiveNav(id); setSidebarOpen(false); }}
            >
              <Icon size={20} /><span>{tNav[tKey]}</span>
            </button>
          ))}
        </nav>
        <div className="hp-sidebar-extra">
          <button className="hp-sidebar-btn" onClick={() => {
            if ('Notification' in window) {
              Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                  alert(lang === 'ar' ? 'تم تفعيل التنبيهات بنجاح!' : 'Notifications activées avec succès !');
                }
              });
            }
          }}>
            <Bell size={20} />
            <span>{lang === 'ar' ? 'تفعيل التنبيهات' : 'Activer Notifications'}</span>
          </button>

          <button className="hp-sidebar-btn" onClick={toggleAudio}>
            {isPlaying ? <Volume2 size={20} /> : <VolumeX size={20} />}
            <span>{isPlaying ? hp_t.musicOn : hp_t.musicOff}</span>
          </button>
        </div>
        <div className="hp-social">
          <a href="#" aria-label="Facebook"><IconFacebook /></a>
          <a href="#" aria-label="Instagram"><IconInstagram /></a>
          <a href="#" aria-label="Youtube"><IconYoutube /></a>
        </div>
        <div className="hp-sidebar-admin">
          <div className="hp-admin-title">{lang === 'ar' ? 'منطقة الإدارة' : 'Zone Administration'}</div>
          <a href="https://goldprojectbackend-production.up.railway.app/PrixOr.apk" className="hp-admin-download" download>
            <ShieldCheck size={18} />
            <span>{lang === 'ar' ? 'تحميل تطبيق المسؤول (Admin)' : 'App Admin (Android)'}</span>
          </a>
          <div className="hp-admin-info">
            {lang === 'ar'
              ? 'بالنسبة لـ iPhone: اذهب إلى صفحة الإدارة واستخدم "إضافة إلى الشاشة الرئيسية"'
              : 'Pour iPhone : Allez sur la page Admin et utilisez "Sur l\'écran d\'accueil"'}
          </div>
        </div>

        <div className="hp-sidebar-footer">
          <div className="hp-sidebar-date">
            <div>{formattedDate}</div>
            <div className="hp-clock">{formattedClock}</div>
          </div>

        </div>
      </aside>

      {/* ─── MAIN ─────────────────────────────────────────────── */}
      <main className="hp-main">

        {/* PWA INSTALL BANNER */}
        {deferredPrompt && !isInstalled && (
          <div className="hp-install-banner">
            <div className="hp-install-info">
              <Smartphone size={20} />
              <span>{lang === 'ar' ? 'قم بتثبيت التطبيق للحصول على تنبيهات فورية' : 'Installez l\'app pour des alertes instantanées'}</span>
            </div>
            <button className="hp-install-btn" onClick={handleInstallClick}>
              {lang === 'ar' ? 'تثبيت الآن' : 'Installer'}
            </button>
            <button className="hp-install-close" onClick={() => setDeferredPrompt(null)}><X size={16} /></button>
          </div>
        )}

        {/* TOP BAR */}
        <header className="hp-topbar">
          <div className="hp-topbar-left">
            <button className="hp-menu-btn" onClick={() => setSidebarOpen(o => !o)}>
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <button className="hp-ctrl-btn" onClick={cycleLang} title="تغيير اللغة">
              <span>🌐</span><span>{lang.toUpperCase()}</span>
            </button>
            <button className={`hp-ctrl-btn ${!isDark ? 'active' : ''}`} onClick={() => setIsDark(d => !d)}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
              <span>{isDark ? hp_t.dayMode : hp_t.nightMode}</span>
            </button>
            <Link to="/chart" className="hp-ctrl-btn">
              <ChartIcon size={16} /><span>{hp_t.fullChartMenu}</span>
            </Link>
            <button className={`hp-ctrl-btn ${isPlaying ? 'active' : 'danger'}`} onClick={toggleAudio}>
              {isPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>{isPlaying ? hp_t.musicOn : hp_t.musicOff}</span>
            </button>
            <Link to="/TV" className="hp-ctrl-btn" title={hp_t.tvDisplay}>
              📺 <span>{hp_t.tvDisplay}</span>
            </Link>
          </div>
          <div className="hp-topbar-right">
            <div className="hp-brand-text">
              <span className="hp-brand-ar">{hp_t.brandAr}</span>
              <span className="hp-brand-fr">{hp_t.brandFr}</span>
            </div>
            <div className="hp-topbar-logo">
              <img src={logo} alt="FMB" />
              <div className="hp-fmb-badge">FMB</div>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div className="hp-content">

          {activeNav === 'home' && (
            <>
              {/* HERO TITLE */}
              <div className="hp-hero-title">
                <div className="hp-hero-left">
                  <div className="hp-title-wrapper" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <img src={goldBars} alt="" className="hp-title-icon" />
                    <h1>{hp_t.title}</h1>
                    <img src={goldBars} alt="" className="hp-title-icon" />
                  </div>
                  <div className="hp-subtitle" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{hp_t.subtitle}</div>
                </div>
              </div>

              {/* MIDDLE ROW */}
              <div className="hp-middle-row">

                {/* PRICE PANEL */}
                <div className={`hp-price-panel ${priceFlash ? 'flash' : ''}`}>
                  <div className="hp-price-header">
                    <div className="hp-price-badge">
                      <span className="hp-badge-dot"></span>
                      <span>{hp_t.lastUpdate}</span>
                    </div>
                    <div className="hp-price-date">📅 {priceDate}</div>
                  </div>
                  <div className="hp-price-img-row" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <img src={goldBars} alt="or" className="hp-price-goldbars" />

                    <div className="hp-price-label">{hp_t.startingFrom}</div>

                    <div className="hp-price-value">
                      <div className="hp-price-number">
                        {loading ? '...' : Math.round(basePrice)}
                      </div>
                      <div className="hp-price-label">{hp_t.currency}</div>
                    </div>
                  </div>
                  <Link to="/TV" className="hp-tv-link">
                    {hp_t.tvLink}
                  </Link>
                </div>

                {/* ── CHART PANEL — same as /chart ── */}
                <div className="hp-chart-panel">
                  <div className="hp-chart-header">
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      {hp_t.chartTitle}
                    </span>
                    {/* Period buttons */}
                    <div className="hp-chart-tabs">
                      {PERIODS.map(p => (
                        <button
                          key={p.key}
                          className={`hp-chart-tab ${chartPeriod === p.key ? 'active' : ''}`}
                          onClick={() => setChartPeriod(p.key)}
                        >
                          {tPer[p.tKey]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stats row */}
                  {filtered.length > 0 && (
                    <div className="hp-chart-stats">
                      <span className="hp-stat">
                        <span className="hp-stat-label">{hp_t.current}</span>
                        <span className="hp-stat-val" style={{ color: '#10b981' }}>
                          {filtered[filtered.length - 1].price.toFixed(2)}
                          <small> {hp_t.currencyShort}</small>
                        </span>
                      </span>
                      <span className="hp-stat">
                        <span className="hp-stat-label">{hp_t.min}</span>
                        <span className="hp-stat-val" style={{ color: '#ef4444' }}>
                          {minPrice.toFixed(2)}<small> {hp_t.currencyShort}</small>
                        </span>
                      </span>
                      <span className="hp-stat">
                        <span className="hp-stat-label">{hp_t.max}</span>
                        <span className="hp-stat-val" style={{ color: '#D4AF37' }}>
                          {maxPrice.toFixed(2)}<small> {hp_t.currencyShort}</small>
                        </span>
                      </span>
                      <span className="hp-stat">
                        <span className="hp-stat-label">{hp_t.avg}</span>
                        <span className="hp-stat-val">
                          {avgPrice.toFixed(2)}<small> {hp_t.currencyShort}</small>
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Chart — identical structure to PriceChart */}
                  <div className="hp-chart-wrapper" style={{ height: 220, position: 'relative', width: '100%', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                    {chartLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <div className="spinner" />
                      </div>
                    ) : filtered.length === 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', fontSize: '0.85rem' }}>
                        {hp_t.noData || 'لا توجد بيانات للفترة المحددة'}
                      </div>
                    ) : (
                      <div style={{ position: 'absolute', inset: 0 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                          <AreaChart data={filtered} margin={{ top: 8, right: 8, left: -15, bottom: 0 }}>
                            <defs>
                              <linearGradient id="hpGoldGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.05} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis
                              dataKey="formattedDate"
                              stroke="#555"
                              tick={{ fontSize: 9, fill: '#777' }}
                              interval="preserveStartEnd"
                              minTickGap={20}
                            />
                            <YAxis
                              stroke="#555"
                              domain={[minPrice - 5, maxPrice + 5]}
                              tick={{ fontSize: 9, fill: '#777' }}
                              tickFormatter={v => `${v}`}
                              width={42}
                            />
                            <Tooltip content={<GoldTooltip lang={lang} tCurrency={hp_t.currencyShort} />} />
                            <RechartReferenceLine
                              y={avgPrice}
                              stroke="rgba(212,175,55,0.25)"
                              strokeDasharray="5 5"
                            />
                            <Area
                              type="linear"
                              dataKey="price"
                              stroke="#D4AF37"
                              strokeWidth={2.5}
                              fillOpacity={1}
                              fill="url(#hpGoldGrad)"
                              dot={{ r: 2, fill: '#D4AF37', strokeWidth: 0 }}
                              activeDot={{ r: 5, fill: '#D4AF37', stroke: '#fff', strokeWidth: 2 }}
                              animationDuration={800}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  <Link to="/chart" className="hp-full-chart-btn">
                    <ChartIcon size={14} /> {hp_t.fullChartBtn}
                  </Link>
                </div>

              </div>



              {/* FEATURES */}
              <div className="hp-features-row" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                {tFeat.map((f, i) => {
                  const Icon = FEATURES_ICONS[i];
                  return (
                    <div key={i} className="hp-feature-card">
                      <div className="hp-feature-icon"><Icon size={26} /></div>
                      <div className="hp-feature-title">{f.title}</div>
                      <div className="hp-feature-desc">{f.desc}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeNav === 'prices' && (
            <div className="hp-page-view">
              <h2 className="hp-page-title">{tNav.prices}</h2>
              <div className="hp-karat-row">
                {KARAT_CONFIG.map(({ karat, factor, tKey, featured }) => (
                  <div key={karat} className={`hp-karat-card ${featured ? 'featured' : ''}`}>
                    {featured && <div className="hp-karat-badge">{hp_t.mostTraded}</div>}
                    <div className="hp-karat-label">{tKarats[tKey]}</div>
                    <div className="hp-karat-price">{loading ? '...' : Math.round(basePrice * factor)}</div>
                    <div className="hp-karat-unit">{hp_t.currencyShort}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeNav === 'about' && (
            <div className="hp-page-view hp-text-view">
              <h2 className="hp-page-title">{tNav.about}</h2>
              <div className="hp-page-content" dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ textAlign: lang === 'ar' ? 'right' : 'left', maxWidth: '800px', margin: '0 auto', lineHeight: '1.8', fontSize: '1.05rem', color: 'var(--hp-text)' }}>
                <p>{ABOUT_CONTENT[lang]?.p1 || ABOUT_CONTENT['ar'].p1}</p>

                <h3 style={{ marginTop: '1.5rem', marginBottom: '0.8rem', color: 'var(--hp-gold)' }}>
                  {ABOUT_CONTENT[lang]?.listTitle || ABOUT_CONTENT['ar'].listTitle}
                </h3>

                <ul style={{ paddingInlineStart: '1.5rem', marginBottom: '1.5rem' }}>
                  {(ABOUT_CONTENT[lang]?.list || ABOUT_CONTENT['ar'].list).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>

                <p style={{ marginBottom: '1rem' }}>{ABOUT_CONTENT[lang]?.p2 || ABOUT_CONTENT['ar'].p2}</p>

                <p>{ABOUT_CONTENT[lang]?.p3 || ABOUT_CONTENT['ar'].p3}</p>
              </div>
            </div>
          )}

          {activeNav === 'initiative' && (
            <div className="hp-page-view hp-text-view">
              <h2 className="hp-page-title">{tNav.initiative}</h2>
              <div className="hp-page-content" dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ textAlign: lang === 'ar' ? 'right' : 'left', maxWidth: '800px', margin: '0 auto', lineHeight: '2', fontSize: '1.2rem', color: 'var(--hp-text)' }}>
                <div style={{ background: 'var(--hp-gold-card)', padding: '2rem', borderRadius: '20px', border: '1px solid var(--hp-gold)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                  <p style={{ marginBottom: '1.5rem', fontWeight: 500 }}>{INITIATIVE_CONTENT[lang]?.p1 || INITIATIVE_CONTENT['ar'].p1}</p>
                  <p style={{ marginBottom: '1.5rem' }}>{INITIATIVE_CONTENT[lang]?.p2 || INITIATIVE_CONTENT['ar'].p2}</p>
                  <hr style={{ margin: '2rem 0', opacity: 0.2, borderColor: 'var(--hp-gold)' }} />
                  <p style={{ fontWeight: 700, color: 'var(--hp-gold)', fontSize: '1.1rem' }}>{INITIATIVE_CONTENT[lang]?.p3 || INITIATIVE_CONTENT['ar'].p3}</p>
                </div>
              </div>
            </div>
          )}

          {activeNav === 'contact' && (
            <div className="hp-page-view hp-text-view">
              <h2 className="hp-page-title">{tNav.contact}</h2>
              <div className="hp-page-content" dir="rtl" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  <div style={{ background: 'var(--hp-gold-card)', padding: '1.5rem', borderRadius: '15px', border: '1px solid var(--hp-gold)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.3rem' }}>السيد حكيم بنشعيب</div>
                      <div style={{ color: 'var(--hp-text-soft)', fontSize: '0.9rem' }}>عضو جمعية صوت الصاغة</div>
                    </div>
                    <a href="tel:+212670821356" style={{ background: 'var(--hp-gold)', color: '#000', padding: '0.6rem 1.2rem', borderRadius: '10px', fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Phone size={18} />
                      <span dir="ltr">06 70 82 13 56</span>
                    </a>
                  </div>

                  <div style={{ background: 'var(--hp-gold-card)', padding: '1.5rem', borderRadius: '15px', border: '1px solid var(--hp-gold)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.3rem' }}>الحاج ادريس  الهزاز</div>
                      <div style={{ color: 'var(--hp-text-soft)', fontSize: '0.9rem' }}>للتواصل والاستفسار</div>
                    </div>
                    <a href="tel:+212664164424" style={{ background: 'var(--hp-gold)', color: '#000', padding: '0.6rem 1.2rem', borderRadius: '10px', fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Phone size={18} />
                      <span dir="ltr">06 64 16 44 24</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeNav === 'chart' && (
            <div className="hp-page-view hp-full-chart-view">
              <h2 className="hp-page-title">{tNav.chart}</h2>
              <p className="hp-page-desc" style={{ marginBottom: '2rem', textAlign: 'center' }}>{hp_t.chartTitle}</p>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Link to="/chart" className="hp-full-chart-btn" style={{ fontSize: '1.2rem', padding: '1rem 2rem' }}>
                  <ChartIcon size={24} /> {hp_t.fullChartBtn}
                </Link>
              </div>
            </div>
          )}

          <footer className="global-footer" style={{ marginTop: 'auto', paddingTop: '2rem' }}>
            copyright &copy; 2026; <a href="https://sdbo.ma" target="_blank" rel="noreferrer">sdbo.ma</a>
          </footer>
        </div>

        {/* TOAST NOTIFICATION */}
        {showToast && toastData && (
          <div className="hp-toast">
            <div className="hp-toast-icon">💰</div>
            <div className="hp-toast-content">
              <strong>{lang === 'ar' ? 'تحديث السعر' : 'Mise à jour du prix'}</strong>
              <span>{Math.floor(toastData.price)} {toastData.currency} / {toastData.unit}</span>
            </div>
          </div>
        )}
      </main>

      {sidebarOpen && (
        <div className="hp-overlay" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
