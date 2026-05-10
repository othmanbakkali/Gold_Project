const fs = require('fs');

const ar = {
  nav: { home: 'الصفحة الرئيسية', prices: 'أسعار الذهب', chart: 'الرسم البياني', about: 'عن الفدرالية', contact: 'اتصل بنا' },
  periods: { days3: 'آخر 3 أيام', week: 'الأسبوع', month: 'الشهر', months3: '3 أشهر' },
  features: [
    { title: 'موثوق', desc: 'بيانات دقيقة من مصادر موثوقة ومعتمدة' },
    { title: 'فوري', desc: 'تحديث الأسعار بشكل لحظي وفوري' },
    { title: 'شفاف', desc: 'معطيات واضحة وشفافة للجميع' },
    { title: 'متوفر في كل مكان', desc: 'على جميع الأجهزة (موبايل، ويب، تلفاز ذكي)' },
    { title: 'خدمة احترافية', desc: 'دعم ومواكبة لجميع المهنيين' }
  ],
  karats: { k14: 'عيار 14', k21: 'عيار 21', k22: 'عيار 22', k18: 'عيار 18', k24: 'عيار 24' },
  hp: {
    title: 'سعر الذهب الخام عيار 18', subtitle: '── أسعار الذهب اليومية في المغرب ──', startingFrom: 'إنطلاقا من', currency: 'درهم/غرام',
    dayMode: 'الوضع النهاري', nightMode: 'الوضع الليلي', fullChartMenu: 'الرسم البياني الكامل', musicOn: 'موسيقى مفعلة', musicOff: 'موسيقى معطلة', tvDisplay: 'شاشة TV',
    brandAr: 'الفدرالية المغربية للصياغين', brandFr: 'FÉDÉRATION MAROCAINE DES BIJOUTIERS',
    lastUpdate: 'التحديث الأخير', tvLink: '📺 عرض شاشة التلفزيون',
    chartTitle: 'تطور سعر الذهب (عيار 18)', current: 'الحالي', min: 'الأدنى', max: 'الأعلى', avg: 'المتوسط', fullChartBtn: 'عرض الرسم البياني الكامل',
    mostTraded: 'الأكثر تداولا', currencyShort: 'درهم/غ'
  }
};

const fr = {
  nav: { home: 'Accueil', prices: 'Prix de l\'or', chart: 'Graphique', about: 'À propos', contact: 'Contact' },
  periods: { days3: '3 derniers jours', week: 'Semaine', month: 'Mois', months3: '3 mois' },
  features: [
    { title: 'Fiable', desc: 'Données précises de sources vérifiées' },
    { title: 'Immédiat', desc: 'Mise à jour instantanée des prix' },
    { title: 'Transparent', desc: 'Des données claires pour tous' },
    { title: 'Multi-plateforme', desc: 'Disponible sur mobile, web, TV' },
    { title: 'Service Pro', desc: 'Support dédié aux professionnels' }
  ],
  karats: { k14: '14 Carats', k21: '21 Carats', k22: '22 Carats', k18: '18 Carats', k24: '24 Carats' },
  hp: {
    title: 'Prix de l\'or brut 18 carats', subtitle: '── Prix de l\'or quotidien au Maroc ──', startingFrom: 'à partir de', currency: 'MAD/gramme',
    dayMode: 'Mode Jour', nightMode: 'Mode Nuit', fullChartMenu: 'Graphique complet', musicOn: 'Musique On', musicOff: 'Musique Off', tvDisplay: 'Écran TV',
    brandAr: 'الفدرالية المغربية للصياغين', brandFr: 'FÉDÉRATION MAROCAINE DES BIJOUTIERS',
    lastUpdate: 'Dernière mise à jour', tvLink: '📺 Écran TV',
    chartTitle: 'Évolution du Prix (18K)', current: 'Actuel', min: 'Min', max: 'Max', avg: 'Moyenne', fullChartBtn: 'Voir le graphique complet',
    mostTraded: 'Le plus négocié', currencyShort: 'MAD/g'
  }
};

const en = {
  nav: { home: 'Home', prices: 'Gold Prices', chart: 'Chart', about: 'About us', contact: 'Contact' },
  periods: { days3: 'Last 3 Days', week: 'Week', month: 'Month', months3: '3 Months' },
  features: [
    { title: 'Reliable', desc: 'Accurate data from trusted sources' },
    { title: 'Instant', desc: 'Real-time price updates' },
    { title: 'Transparent', desc: 'Clear and transparent data for all' },
    { title: 'Anywhere', desc: 'Available on Mobile, Web, and Smart TV' },
    { title: 'Pro Support', desc: 'Dedicated support for professionals' }
  ],
  karats: { k14: '14 Karat', k21: '21 Karat', k22: '22 Karat', k18: '18 Karat', k24: '24 Karat' },
  hp: {
    title: '18K Raw Gold Price', subtitle: '── Daily Gold Prices in Morocco ──', startingFrom: 'starting from', currency: 'MAD/gram',
    dayMode: 'Day Mode', nightMode: 'Night Mode', fullChartMenu: 'Full Chart', musicOn: 'Music On', musicOff: 'Music Off', tvDisplay: 'TV Display',
    brandAr: 'الفدرالية المغربية للصياغين', brandFr: 'FÉDÉRATION MAROCAINE DES BIJOUTIERS',
    lastUpdate: 'Last Update', tvLink: '📺 TV Display',
    chartTitle: 'Gold Price Evolution (18K)', current: 'Current', min: 'Min', max: 'Max', avg: 'Average', fullChartBtn: 'View Full Chart',
    mostTraded: 'Most Traded', currencyShort: 'MAD/g'
  }
};

const es = {
  nav: { home: 'Inicio', prices: 'Precios del Oro', chart: 'Gráfico', about: 'Nosotros', contact: 'Contacto' },
  periods: { days3: 'Últimos 3 días', week: 'Semana', month: 'Mes', months3: '3 meses' },
  features: [
    { title: 'Confiable', desc: 'Datos precisos de fuentes fiables' },
    { title: 'Inmediato', desc: 'Actualizaciones en tiempo real' },
    { title: 'Transparente', desc: 'Datos claros y transparentes para todos' },
    { title: 'Accesible', desc: 'Disponible en Móvil, Web y TV' },
    { title: 'Soporte Pro', desc: 'Soporte dedicado para profesionales' }
  ],
  karats: { k14: '14 Quilates', k21: '21 Quilates', k22: '22 Quilates', k18: '18 Quilates', k24: '24 Quilates' },
  hp: {
    title: 'Precio del oro bruto 18 quilates', subtitle: '── Precios diarios del oro en Marruecos ──', startingFrom: 'a partir de', currency: 'MAD/gramo',
    dayMode: 'Modo Día', nightMode: 'Modo Noche', fullChartMenu: 'Gráfico completo', musicOn: 'Música On', musicOff: 'Música Off', tvDisplay: 'Pantalla TV',
    brandAr: 'الفدرالية المغربية للصياغين', brandFr: 'FÉDÉRATION MAROCAINE DES BIJOUTIERS',
    lastUpdate: 'Última actualización', tvLink: '📺 Pantalla TV',
    chartTitle: 'Evolución del Precio (18K)', current: 'Actual', min: 'Mín', max: 'Máx', avg: 'Promedio', fullChartBtn: 'Ver Gráfico Completo',
    mostTraded: 'Más negociado', currencyShort: 'MAD/g'
  }
};

const originalContent = fs.readFileSync('c:/Projects/gold/Gold_Project/client/src/translations.js', 'utf8');

// Extract existing tv and admin translations, we will just hardcode them in script to rebuild it cleanly
const tvAr = {
  title: "سعر الذهب الخام عيار 18 ",
  updatedAt: "آخر تحديث:",
  connecting: "جاري الاتصال بالسوق العالمي...",
  networkError: "خطأ في الشبكة",
  disconnected: "تم قطع الاتصال بالخادم. في انتظار إعادة الاتصال...",
  reconnecting: "تعذر الاتصال بالخادم. جاري إعادة المحاولة...",
  pricePrefix: "سعر اليوم في المغرب",
  startingFrom: "إنطلاقا من ",
  currency: "درهم/غرام",
  priceSuffix: "<b class='animate-service'> زائد المصنعية</b>",
  viewChart: "عرض الرسم البياني",
  chartTitle: "تطور سعر الذهب (عيار 18)",
  lastWeek: "آخر 7 أيام",
  lastMonth: "الشهر الماضي",
  back: "عودة"
};
const adminAr = {
  title: "لوحة التحكم",
  backToTv: "العودة إلى الشاشة",
  priceLabel: "سعر الذهب الجديد (درهم/غرام)",
  pricePlaceholder: "مثال: 750.50",
  passwordLabel: "كلمة مرور المسؤول",
  passwordPlaceholder: "أدخل كلمة المرور",
  submitBtn: "نشر السعر",
  submitting: "جاري التحديث...",
  success: "تم تحديث السعر بنجاح على جميع الشاشات!",
  connError: "خطأ في الاتصال بالخادم"
};

const tvFr = {
  title: "Prix de l'or brut 18 carats",
  updatedAt: "Mise à jour :",
  connecting: "Connexion à la bourse mondiale...",
  networkError: "Erreur réseau",
  disconnected: "Serveur déconnecté. En attente de reconnexion...",
  reconnecting: "Impossible de se connecter au serveur. Nouvel essai...",
  pricePrefix: "Prix du jour au Maroc :",
  startingFrom: "à partir de ",
  currency: "Dh/g",
  priceSuffix: " <b class='animate-service'>Plus Main d'oeuvre</b>",
  viewChart: "Voir l'évolution",
  chartTitle: "Évolution du Prix de l'Or (18K)",
  last3Days: "3 Derniers Jours",
  lastWeek: "7 Derniers Jours",
  lastMonth: "Dernier Mois",
  last3Months: "3 Derniers Mois",
  back: "Retour"
};
const adminFr = {
  title: "Administration",
  backToTv: "Retour à la TV",
  priceLabel: "Nouveau Prix de l'Or (MAD/g)",
  pricePlaceholder: "Ex: 750.50",
  passwordLabel: "Mot de Passe Admin",
  passwordPlaceholder: "Entrez le mot de passe",
  submitBtn: "Publier le prix",
  submitting: "Mise à jour...",
  success: "Le prix a été mis à jour avec succès sur toutes les TVs !",
  connError: "Erreur de connexion au serveur"
};

const tvEn = {
  title: "Raw Gold Price 18K",
  updatedAt: "Last updated:",
  connecting: "Connecting to global market...",
  networkError: "Network error",
  disconnected: "Server disconnected. Waiting for reconnection...",
  reconnecting: "Unable to connect to server. Retrying...",
  pricePrefix: "Today's price in Morocco:",
  startingFrom: "from ",
  currency: "Dh/g",
  priceSuffix: "  <b class='animate-service'>Plus Craftsmanship</b>",
  viewChart: "View History",
  chartTitle: "Gold Price Evolution (18K)",
  lastWeek: "Last 7 Days",
  lastMonth: "Last Month",
  back: "Back"
};
const adminEn = {
  title: "Administration",
  backToTv: "Back to TV",
  priceLabel: "New Gold Price (MAD/g)",
  pricePlaceholder: "Ex: 750.50",
  passwordLabel: "Admin Password",
  passwordPlaceholder: "Enter password",
  submitBtn: "Publish Price",
  submitting: "Updating...",
  success: "Price updated successfully on all TVs!",
  connError: "Connection error to server"
};

const tvEs = {
  title: "Precio del Oro Bruto 18 Quilates",
  updatedAt: "Actualizado:",
  connecting: "Conectando al mercado global...",
  networkError: "Error de red",
  disconnected: "Servidor desconectado. Esperando reconexión...",
  reconnecting: "No se puede conectar al servidor. Reintentando...",
  pricePrefix: "Precio de hoy en Marruecos:",
  startingFrom: "a partir de ",
  currency: "Dh/g",
  priceSuffix: " <b class='animate-service'>Más Mano de Obra</b>",
  viewChart: "Ver Historial",
  chartTitle: "Evolución del Precio del Oro (18K)",
  lastWeek: "Últimos 7 Días",
  lastMonth: "Último Mes",
  back: "Volver"
};
const adminEs = {
  title: "Administración",
  backToTv: "Volver a la TV",
  priceLabel: "Nuevo Precio del Oro (MAD/g)",
  pricePlaceholder: "Ej: 750.50",
  passwordLabel: "Contraseña de Admin",
  passwordPlaceholder: "Ingrese contraseña",
  submitBtn: "Publicar Precio",
  submitting: "Actualizando...",
  success: "¡Precio actualizado con éxito en todas las pantallas!",
  connError: "Error de conexión al servidor"
};

const finalObj = {
  fr: { ...fr, tv: tvFr, admin: adminFr },
  en: { ...en, tv: tvEn, admin: adminEn },
  ar: { ...ar, tv: tvAr, admin: adminAr },
  es: { ...es, tv: tvEs, admin: adminEs }
};

fs.writeFileSync('c:/Projects/gold/Gold_Project/client/src/translations.js', 'export const translations = ' + JSON.stringify(finalObj, null, 2) + ';\n');
