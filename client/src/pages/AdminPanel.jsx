import { useState, useEffect } from 'react';
import { Save, Lock, ArrowLeft, AreaChart as ChartIcon, User, Users, UserPlus, CheckCircle, XCircle, Shield, Smartphone, Bell, Download, Sparkles, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { translations } from '../translations';

const SERVER_URL = 'https://goldprojectbackend-production.up.railway.app';

const parseDate = (dateStr) => {
  if (!dateStr) return null;
  // Parse ISO string safely, then format using Casablanca timezone
  const date = new Date(dateStr);
  // Return Date object; formatting will apply timezone during toLocaleString calls
  return date;
};

export default function AdminPanel() {
  const [price, setPrice] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('price');
  const [usersList, setUsersList] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', isActive: true });
  const [lang, setLang] = useState('ar');
  const t = translations[lang].admin;

  // ── État pour la gestion des mises à jour mobiles ──────────────────────────
  const [appVersionForm, setAppVersionForm] = useState({
    version: '1.2.0',
    versionCode: 3,
    minVersionCode: 1,
    forceUpdate: false,
    apkUrl: 'https://goldprojectbackend-production.up.railway.app/PrixOr.apk',
    titleAr: 'تحديث جديد متوفر للتطبيق',
    titleFr: 'Nouvelle mise à jour disponible',
    messageAr: 'يتوفر إصدار جديد من تطبيق سعر الذهب. يرجى تحديث التطبيق للاستفادة من أحدث المميزات ودقة الأسعار المباشرة.',
    messageFr: 'Une nouvelle version de PrixOr est disponible. Veuillez mettre à jour l\'application pour profiter des dernières améliorations.',
    notesAr: '• تحسين سرعة واستقرار التطبيق\n• دقة الأسعار وتحديثات فورية في الوقت الفعلي\n• تحسين التوافق مع أجهزة أندرويد',
    notesFr: '• Améliorations de performance et stabilité\n• Nouvelles fonctionnalités et prix en temps réel\n• Compatibilité optimisée Android & PWA',
    sendPushNotification: true,
    broadcastSocket: true
  });
  const [fcmCount, setFcmCount] = useState(0);

  const fetchAppVersion = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/app-version`);
      if (res.ok) {
        const data = await res.json();
        setAppVersionForm(prev => ({
          ...prev,
          ...data,
          sendPushNotification: true,
          broadcastSocket: true
        }));
      }
    } catch (err) {
      console.error('Erreur fetch app version:', err);
    }

    try {
      const countRes = await fetch(`${SERVER_URL}/api/fcm/count`);
      if (countRes.ok) {
        const cData = await countRes.json();
        setFcmCount(cData.count || 0);
      }
    } catch (err) {
      console.error('Erreur fetch fcm count:', err);
    }
  };

  const handleSaveAppVersion = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setStatus({ type: 'error', message: 'Veuillez saisir votre identifiant et mot de passe.' });
      return;
    }
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const res = await fetch(`${SERVER_URL}/api/admin/app-version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          ...appVersionForm
        })
      });

      const data = await res.json();
      if (res.ok) {
        setStatus({
          type: 'success',
          message: lang === 'ar'
            ? `تم حفظ التحديث بنجاح! تم إشعار ${data.notifiedDevices || 0} جهاز.`
            : `Mise à jour enregistrée ! ${data.notifiedDevices || 0} appareils notifiés.`
        });
        fetchAppVersion();
      } else {
        setStatus({ type: 'error', message: data.error || 'Erreur lors de la mise à jour.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: t.connError });
    } finally {
      setLoading(false);
    }
  };

  const handleNotifyOnly = async () => {
    if (!username || !password) {
      setStatus({ type: 'error', message: 'Veuillez saisir votre identifiant et mot de passe.' });
      return;
    }
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const res = await fetch(`${SERVER_URL}/api/admin/app-version/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({
          type: 'success',
          message: lang === 'ar'
            ? `تم إرسال تنبيه التحديث إلى ${data.notifiedDevices || 0} هاتف!`
            : `Alerte de mise à jour envoyée à ${data.notifiedDevices || 0} appareils !`
        });
      } else {
        setStatus({ type: 'error', message: data.error || 'Erreur.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: t.connError });
    } finally {
      setLoading(false);
    }
  };

  // Fetch current price to populate form
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/api/price`);
        if (response.ok) {
          const data = await response.json();

          if (data) {
            if (data.price !== undefined) {
              setPrice(data.price.toString());
            }

            if (data.date) {
              setLastUpdated(data.date);
            }
          }
        }
      } catch (err) {
        console.error('Erreur lors de la récupération du prix actuel:', err);
        setStatus({ type: 'error', message: t.connError });
      }
    };
    fetchPrice();
  }, []);

  const fetchUsers = async () => {
    if (!username || !password) {
      setStatus({ type: 'error', message: 'Entrez vos identifiants pour voir les utilisateurs.' });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/users?username=${username}&password=${password}`);
      const data = await response.json();
      if (response.ok) {
        setUsersList(data);
        setStatus({ type: '', message: '' });
      } else {
        setStatus({ type: 'error', message: data.error || 'Erreur d\'authentification' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: t.connError });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUser: username,
          adminPass: password,
          newUsername: newUser.username,
          newPassword: newUser.password,
          isActive: newUser.isActive
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setStatus({ type: 'success', message: 'Utilisateur ajouté avec succès' });
        setNewUser({ username: '', password: '', isActive: true });
        fetchUsers();
      } else {
        setStatus({ type: 'error', message: data.error });
      }
    } catch (err) {
      setStatus({ type: 'error', message: t.connError });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    if (!username || !password) return;
    setLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUser: username,
          adminPass: password,
          isActive: !currentStatus
        }),
      });
      if (response.ok) {
        fetchUsers();
      } else {
        const data = await response.json();
        setStatus({ type: 'error', message: data.error });
      }
    } catch (err) {
      setStatus({ type: 'error', message: t.connError });
    } finally {
      setLoading(false);
    }
  };

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
          username: username,
          newPrice: parseFloat(price),
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
        if (data.data && data.data.date) {
          setLastUpdated(data.data.date);
        }
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
            <option value="fr" style={{ color: '#000' }}>FR</option>
            <option value="en" style={{ color: '#000' }}>EN</option>
            <option value="ar" style={{ color: '#000' }}>AR</option>
            <option value="es" style={{ color: '#000' }}>ES</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <Link to="/TV" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={16} /> {t.backToTv}
          </Link>
          <Link to="/chart" style={{ color: 'var(--gold-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ChartIcon size={16} /> {translations[lang].tv.viewChart}
          </Link>
        </div>
        <h1>{t.title}</h1>

        {/* Identifiants Admin Globaux */}
        <div className="form-group" style={{ display: 'flex', gap: '1rem', flexDirection: lang === 'ar' ? 'row-reverse' : 'row', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="username">{t.usernameLabel || "Nom d'utilisateur"}</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', top: '50%', left: lang === 'ar' ? 'auto' : '1rem', right: lang === 'ar' ? '1rem' : 'auto', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                id="username"
                required
                className="form-input"
                style={{ paddingLeft: lang === 'ar' ? '1rem' : '3rem', paddingRight: lang === 'ar' ? '3rem' : '1rem' }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.usernamePlaceholder || "Admin"}
              />
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <label htmlFor="password">{t.passwordLabel || "Mot de passe"}</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', top: '50%', left: lang === 'ar' ? 'auto' : '1rem', right: lang === 'ar' ? '1rem' : 'auto', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                id="password"
                required
                className="form-input"
                style={{ paddingLeft: lang === 'ar' ? '1rem' : '3rem', paddingRight: lang === 'ar' ? '3rem' : '1rem' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #333' }}>
          <button
            type="button"
            onClick={() => setActiveTab('price')}
            style={{ flex: 1, padding: '0.5rem', background: 'transparent', border: 'none', color: activeTab === 'price' ? 'var(--gold-primary)' : 'var(--text-muted)', borderBottom: activeTab === 'price' ? '2px solid var(--gold-primary)' : 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {lang === 'ar' ? 'تحديث السعر' : lang === 'en' ? 'Update Price' : lang === 'es' ? 'Actualizar Precio' : 'Prix de l\'or'}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('users');
              fetchUsers();
            }}
            style={{ flex: 1, padding: '0.5rem', background: 'transparent', border: 'none', color: activeTab === 'users' ? 'var(--gold-primary)' : 'var(--text-muted)', borderBottom: activeTab === 'users' ? '2px solid var(--gold-primary)' : 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <Users size={18} /> {lang === 'ar' ? 'المستخدمين' : lang === 'en' ? 'Users' : lang === 'es' ? 'Usuarios' : 'Utilisateurs'}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('mobileUpdate');
              fetchAppVersion();
            }}
            style={{ flex: 1, padding: '0.5rem', background: 'transparent', border: 'none', color: activeTab === 'mobileUpdate' ? 'var(--gold-primary)' : 'var(--text-muted)', borderBottom: activeTab === 'mobileUpdate' ? '2px solid var(--gold-primary)' : 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <Smartphone size={18} /> {lang === 'ar' ? 'تحديثات الهاتف' : 'MàJ Mobiles'}
          </button>
        </div>

        {activeTab === 'price' ? (
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
        ) : activeTab === 'users' ? (
          <div className="users-management">
            <form onSubmit={handleAddUser} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><UserPlus size={16} /> Ajouter un utilisateur</h3>
              <div style={{ display: 'flex', gap: '1rem', flexDirection: lang === 'ar' ? 'row-reverse' : 'row' }}>
                <input
                  type="text"
                  placeholder="Username"
                  className="form-input"
                  required
                  value={newUser.username}
                  onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                  style={{ flex: 1 }}
                />
                <input
                  type="password"
                  placeholder="Password"
                  className="form-input"
                  required
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  style={{ flex: 1 }}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '1rem', padding: '0.5rem' }} disabled={loading}>
                {loading ? '...' : 'Créer'}
              </button>
            </form>

            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: lang === 'ar' ? 'right' : 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333', background: 'rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '0.75rem' }}>ID</th>
                    <th style={{ padding: '0.75rem' }}>Username</th>
                    <th style={{ padding: '0.75rem' }}>Statut</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.length === 0 ? (
                    <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: 'gray' }}>Aucun utilisateur ou accès refusé.</td></tr>
                  ) : usersList.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '0.75rem', color: 'gray' }}>#{u.id}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{u.username}</td>
                      <td style={{ padding: '0.75rem' }}>
                        {u.is_active ? (
                          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={14} /> Actif</span>
                        ) : (
                          <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle size={14} /> Inactif</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <button
                          onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                          disabled={loading}
                          style={{
                            background: u.is_active ? '#ef4444' : '#10b981',
                            color: 'white', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem'
                          }}
                        >
                          {u.is_active ? 'Désactiver' : 'Activer'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'mobileUpdate' ? (
          <div className="mobile-update-view" style={{ textAlign: lang === 'ar' ? 'right' : 'left' }}>
            {/* Header info */}
            <div style={{ background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(20, 24, 33, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.35)', borderRadius: '15px', padding: '1.25rem', marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ background: 'rgba(212, 175, 55, 0.2)', padding: '0.6rem', borderRadius: '12px', color: 'var(--gold-primary)' }}>
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>
                      {lang === 'ar' ? 'نظام طلب تحديث التطبيق على الهواتف' : 'Gestion des Mises à jour Mobiles (Android APK & PWA)'}
                    </h3>
                    <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {lang === 'ar' 
                        ? 'طلب التحديث من جميع مستخدمي الهواتف فور إصدار أي نسخة جديدة'
                        : 'Alerte automatique tous les utilisateurs mobiles pour installer la dernière version'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNotifyOnly}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'rgba(212, 175, 55, 0.2)',
                    border: '1px solid var(--gold-primary)',
                    color: 'var(--gold-primary)',
                    borderRadius: '8px',
                    padding: '0.6rem 1rem',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.85rem'
                  }}
                >
                  <Bell size={16} />
                  <span>{lang === 'ar' ? 'إعادة إرسال تنبيه فوري' : 'Renvoyer une alerte'}</span>
                </button>
              </div>

              {/* Status metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem 1rem', borderRadius: '10px', borderLeft: '3px solid #d4af37' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Version active</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fbbf24' }}>
                    v{appVersionForm.version} <span style={{ fontSize: '0.8rem', color: 'gray' }}>(Code: {appVersionForm.versionCode})</span>
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem 1rem', borderRadius: '10px', borderLeft: '3px solid #10b981' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Téléphones inscrits (FCM Push)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>
                    {fcmCount} appareils
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem 1rem', borderRadius: '10px', borderLeft: `3px solid ${appVersionForm.forceUpdate ? '#ef4444' : '#3b82f6'}` }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Type de mise à jour</div>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', color: appVersionForm.forceUpdate ? '#f87171' : '#60a5fa' }}>
                    {appVersionForm.forceUpdate ? 'Obligatoire (Bloquante)' : 'Recommandée'}
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem 1rem', borderRadius: '10px', borderLeft: '3px solid #a855f7' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Fichier APK Client</div>
                  <a 
                    href="https://goldprojectbackend-production.up.railway.app/PrixOr.apk" 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{ fontSize: '0.85rem', color: '#c084fc', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', fontWeight: 'bold' }}
                  >
                    <Download size={14} /> Tester / Télécharger APK
                  </a>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveAppVersion} style={{ background: 'rgba(255,255,255,0.04)', padding: '1.5rem', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1.25rem', fontSize: '1.1rem', color: 'var(--gold-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} />
                {lang === 'ar' ? 'إعدادات الإصدار الجديد وإرسال الإشعار' : 'Publier une nouvelle version et notifier les mobiles'}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label htmlFor="cpVersionNum" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    {lang === 'ar' ? 'رقم الإصدار (Version Name)' : 'Numéro de Version'}
                  </label>
                  <input
                    type="text"
                    id="cpVersionNum"
                    required
                    className="form-input"
                    value={appVersionForm.version}
                    onChange={e => setAppVersionForm({ ...appVersionForm, version: e.target.value })}
                    placeholder="Ex: 1.2.0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cpVersionCode" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    {lang === 'ar' ? 'رمز الإصدار (Version Code - رقم تصاعدي)' : 'Code de Version (Entier)'}
                  </label>
                  <input
                    type="number"
                    id="cpVersionCode"
                    required
                    min="1"
                    className="form-input"
                    value={appVersionForm.versionCode}
                    onChange={e => setAppVersionForm({ ...appVersionForm, versionCode: parseInt(e.target.value, 10) || 1 })}
                    placeholder="Ex: 3"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cpMinVersionCode" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    {lang === 'ar' ? 'الحد الأدنى لرمز الإصدار المطلوب' : 'Code Minimal Requis'}
                  </label>
                  <input
                    type="number"
                    id="cpMinVersionCode"
                    min="1"
                    className="form-input"
                    value={appVersionForm.minVersionCode}
                    onChange={e => setAppVersionForm({ ...appVersionForm, minVersionCode: parseInt(e.target.value, 10) || 1 })}
                    placeholder="Ex: 1"
                  />
                </div>
              </div>

              {/* Force update checkbox */}
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="checkbox"
                  id="cpForceUpdate"
                  checked={appVersionForm.forceUpdate}
                  onChange={e => setAppVersionForm({ ...appVersionForm, forceUpdate: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#ef4444' }}
                />
                <label htmlFor="cpForceUpdate" style={{ cursor: 'pointer', fontSize: '0.9rem', color: '#fca5a5', fontWeight: 'bold' }}>
                  {lang === 'ar'
                    ? 'تحديث إجباري (يمنع استخدام التطبيق القديم حتى يتم التحديث)'
                    : 'Mise à jour obligatoire (Bloque l\'application sur mobile jusqu\'à l\'installation)'}
                </label>
              </div>

              {/* APK URL */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="cpApkUrl" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  {lang === 'ar' ? 'رابط ملف APK للتحميل المباشر' : 'Lien de téléchargement du fichier APK'}
                </label>
                <input
                  type="text"
                  id="cpApkUrl"
                  required
                  className="form-input"
                  value={appVersionForm.apkUrl}
                  onChange={e => setAppVersionForm({ ...appVersionForm, apkUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              {/* Titles & Messages */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label htmlFor="cpTitleFr" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    Titre de l'alerte (Français)
                  </label>
                  <input
                    type="text"
                    id="cpTitleFr"
                    className="form-input"
                    value={appVersionForm.titleFr}
                    onChange={e => setAppVersionForm({ ...appVersionForm, titleFr: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cpTitleAr" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'right' }}>
                    عنوان التنبيه (عربي)
                  </label>
                  <input
                    type="text"
                    id="cpTitleAr"
                    className="form-input"
                    dir="rtl"
                    value={appVersionForm.titleAr}
                    onChange={e => setAppVersionForm({ ...appVersionForm, titleAr: e.target.value })}
                  />
                </div>
              </div>

              {/* Release notes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label htmlFor="cpNotesFr" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    Nouveautés & Notes de mise à jour (Français)
                  </label>
                  <textarea
                    id="cpNotesFr"
                    rows="3"
                    className="form-input"
                    style={{ resize: 'vertical' }}
                    value={appVersionForm.notesFr}
                    onChange={e => setAppVersionForm({ ...appVersionForm, notesFr: e.target.value })}
                    placeholder="• Nouvelle fonctionnalité..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cpNotesAr" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'right' }}>
                    ما الجديد والمميزات (عربي)
                  </label>
                  <textarea
                    id="cpNotesAr"
                    rows="3"
                    dir="rtl"
                    className="form-input"
                    style={{ resize: 'vertical' }}
                    value={appVersionForm.notesAr}
                    onChange={e => setAppVersionForm({ ...appVersionForm, notesAr: e.target.value })}
                    placeholder="• ميزة جديدة..."
                  />
                </div>
              </div>

              {/* Broadcast Options */}
              <div style={{ background: 'rgba(212, 175, 55, 0.08)', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ fontWeight: 'bold', color: 'var(--gold-primary)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                  {lang === 'ar' ? 'خيارات الإرسال والتنبيه :' : 'Options de diffusion de l\'alerte :'}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                    <input
                      type="checkbox"
                      checked={appVersionForm.sendPushNotification}
                      onChange={e => setAppVersionForm({ ...appVersionForm, sendPushNotification: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--gold-primary)' }}
                    />
                    <span>{lang === 'ar' ? 'إرسال إشعار فوري (Push Notification) لجميع الهواتف المحمولة' : 'Envoyer une notification push FCM à tous les téléphones enregistrés'}</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                    <input
                      type="checkbox"
                      checked={appVersionForm.broadcastSocket}
                      onChange={e => setAppVersionForm({ ...appVersionForm, broadcastSocket: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--gold-primary)' }}
                    />
                    <span>{lang === 'ar' ? 'إظهار نافذة التحديث فوراً في التطبيق لجميع المستخدمين المتصلين حالياً' : 'Afficher la fenêtre de mise à jour instantanément aux utilisateurs connectés (Socket.IO)'}</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem'
                }}
              >
                <Send size={18} />
                <span>
                  {loading 
                    ? (lang === 'ar' ? 'جاري النشر والإشعار...' : 'Envoi de l\'alerte...')
                    : (lang === 'ar' ? '🚀 نشر التحديث وإشعار جميع المستخدمين على الهواتف' : '🚀 Publier & Demander la mise à jour à tous les mobiles')}
                </span>
              </button>
            </form>
          </div>
        ) : null}

        {status.message && (
          <div className={`status-message status-${status.type}`}>
            {status.message}
          </div>
        )}
        {/* ✅ AJOUT ICI */}
        {lastUpdated && (
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              🕒 {lang === 'ar' ? 'آخر تحديث' : lang === 'en' ? 'Last update' : lang === 'es' ? 'Última actualización' : 'Dernière mise à jour'}
            </div>
            <div style={{ color: '#60a5fa', fontSize: '1rem', fontWeight: '500', marginTop: '0.2rem' }}>
              {parseDate(lastUpdated)?.toLocaleDateString(lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'Africa/Casablanca'
              })}
            </div>
            <div style={{ color: 'var(--gold-primary)', fontSize: '1.4rem', fontWeight: '900', marginTop: '0.1rem', letterSpacing: '1px' }}>
              {parseDate(lastUpdated)?.toLocaleTimeString(lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: 'Africa/Casablanca'
              })}
            </div>
          </div>
        )}
      </div>

      <footer className="global-footer">
        copyright &copy; 2026; <a href="https://sdbo.ma" target="_blank" rel="noreferrer">sdbo.ma</a>
      </footer>
    </div>
  );
}
