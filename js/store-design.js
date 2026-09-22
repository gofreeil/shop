// === דף החנות המעוצב: עשרה סגנונות מוכנים + מנוע רינדור אחד ===
//
// המוכר מעצב את הדף שלו בסטודיו (store-designer.html) והדף נבנה מאותו קובץ
// גם בתצוגה המקדימה בסטודיו וגם בדף החנות האמיתי (store.html) - כדי שמה
// שהוא רואה בסטודיו יהיה בדיוק מה שהלקוח יראה.
//
// העיצוב הוא אובייקט אחד (design): סגנון, מקום הלוגו, ורשימת מקטעים עם
// התוכן שלהם והסדר ביניהם. הוא נשמר תמיד בדפדפן (localStorage) וגם בחשבון
// דרך /api/store (שדה store_design ברשומת החנות). משם הוא ציבורי: כל מי
// שנכנס לדף החנות טוען אותו מ-/api/store-design ורואה בדיוק את מה שהמוכר
// עיצב. עד שהחנות מאושרת השרת אינו מחזיר אותו לציבור - בדיוק כמו המוצרים.
//
// נטען אחרי js/main.js (משתמש ב-categories, storeLogoHtml, waLink).

const DESIGN_KEY = 'noshop_store_design';
const DESIGN_VERSION = 1;

// עשרה סגנונות: כל אחד קובע צבעים, גופן, עיגול פינות, צורת הבאנר ומקום
// ברירת מחדל ללוגו. המוכר בוחר אחד ואז מכוון מה שהוא רוצה.
const DESIGN_STYLES = [
  {
    id: 'aurora', name: 'זוהר', hint: 'גרדיאנט טורקיז-סגול, פינות רכות - הסגנון של הקניון',
    hero: 'gradient', logo: 'hero',
    vars: { bg: '#f0fdff', surface: '#ffffff', text: '#0c4a6e', muted: '#0e7490', accent: '#06b6d4', accent2: '#a855f7', border: '#a5f3fc', radius: '22px', font: "'Heebo', sans-serif", weight: '800', shadow: '0 18px 40px -22px rgba(8,145,178,.45)' }
  },
  {
    id: 'clean', name: 'נקי', hint: 'לבן, קווים דקים וטיפוגרפיה שקטה - הכל בשירות המוצר',
    hero: 'center', logo: 'corner',
    vars: { bg: '#ffffff', surface: '#ffffff', text: '#111827', muted: '#6b7280', accent: '#111827', accent2: '#9ca3af', border: '#e5e7eb', radius: '6px', font: "'Heebo', sans-serif", weight: '600', shadow: 'none' }
  },
  {
    id: 'night', name: 'לילה', hint: 'שחור וזהב - יוקרתי, טוב לתכשיטים, אמנות ומוצרי פרימיום',
    hero: 'image', logo: 'hero',
    vars: { bg: '#0b0f19', surface: '#141a29', text: '#f8fafc', muted: '#a1a1aa', accent: '#eab308', accent2: '#f59e0b', border: '#27304a', radius: '14px', font: "'Heebo', sans-serif", weight: '800', shadow: '0 20px 50px -25px rgba(0,0,0,.9)' }
  },
  {
    id: 'earth', name: 'אדמה', hint: 'חום-ירוק טבעי - חקלאות, צמחי מרפא ומוצרים מהאדמה',
    hero: 'band', logo: 'strip',
    vars: { bg: '#f7f5ef', surface: '#fffdf8', text: '#33291d', muted: '#7c6f5b', accent: '#4d7c0f', accent2: '#b45309', border: '#e2d9c6', radius: '18px', font: "'Heebo', sans-serif", weight: '700', shadow: '0 14px 30px -20px rgba(77,124,15,.5)' }
  },
  {
    id: 'pastel', name: 'פסטל', hint: 'ורוד-תכלת רך - טיפוח, תינוקות, מתנות ועבודות יד',
    hero: 'gradient', logo: 'hero',
    vars: { bg: '#fff7fb', surface: '#ffffff', text: '#4a2c4f', muted: '#9b7aa3', accent: '#ec4899', accent2: '#60a5fa', border: '#fbcfe8', radius: '26px', font: "'Heebo', sans-serif", weight: '700', shadow: '0 16px 36px -22px rgba(236,72,153,.45)' }
  },
  {
    id: 'bold', name: 'נועז', hint: 'כותרות ענק וניגודיות חדה - נראה מרחוק, טוב לספורט וטכנולוגיה',
    hero: 'split', logo: 'corner',
    vars: { bg: '#fafafa', surface: '#ffffff', text: '#0a0a0a', muted: '#525252', accent: '#facc15', accent2: '#0a0a0a', border: '#0a0a0a', radius: '2px', font: "'Heebo', sans-serif", weight: '900', shadow: '8px 8px 0 #0a0a0a' }
  },
  {
    id: 'classic', name: 'קלאסי', hint: 'גופן סריפי על בז׳ - ספרים, קורסים, יין ומוצרים עם מסורת',
    hero: 'center', logo: 'strip',
    vars: { bg: '#faf6ee', surface: '#fffdf9', text: '#3b2f1e', muted: '#857254', accent: '#8b5e34', accent2: '#c2a878', border: '#e6dcc6', radius: '4px', font: "'Frank Ruehl', 'David', Georgia, serif", weight: '700', shadow: '0 10px 24px -18px rgba(59,47,30,.5)' }
  },
  {
    id: 'mono', name: 'טכני', hint: 'כחול כהה וגופן מכונה - סטארטאפ, גאדג׳טים ושירותים דיגיטליים',
    hero: 'split', logo: 'corner',
    vars: { bg: '#0f172a', surface: '#17203a', text: '#e2e8f0', muted: '#94a3b8', accent: '#38bdf8', accent2: '#22d3ee', border: '#243355', radius: '8px', font: "'Courier New', 'Heebo', monospace", weight: '700', shadow: '0 18px 40px -24px rgba(56,189,248,.5)' }
  },
  {
    id: 'warm', name: 'חם', hint: 'כתום-אדום של שוק - אוכל, תבלינים, מאפים ומשלוחים',
    hero: 'band', logo: 'hero',
    vars: { bg: '#fff7ed', surface: '#ffffff', text: '#7c2d12', muted: '#b45309', accent: '#ea580c', accent2: '#dc2626', border: '#fed7aa', radius: '20px', font: "'Heebo', sans-serif", weight: '800', shadow: '0 16px 34px -20px rgba(234,88,12,.5)' }
  },
  {
    id: 'mint', name: 'מרפא', hint: 'לבן-ירוק נקי ורגוע - בריאות, תוספים, טיפולים וייעוץ',
    hero: 'image', logo: 'strip',
    vars: { bg: '#f2fdf7', surface: '#ffffff', text: '#064e3b', muted: '#047857', accent: '#10b981', accent2: '#34d399', border: '#bbf7d0', radius: '16px', font: "'Heebo', sans-serif", weight: '700', shadow: '0 14px 32px -22px rgba(16,185,129,.5)' }
  },
];

// מקומות הלוגו - בכל סגנון הלוגו מקבל מקום, וזו הבחירה בין הווריאציות
const DESIGN_LOGO_SPOTS = [
  { id: 'hero', label: 'גדול במרכז הבאנר', hint: 'הלוגו הוא הדבר הראשון שרואים' },
  { id: 'corner', label: 'בפינה ליד שם החנות', hint: 'כמו כותרת של אתר - מלווה בכל גלילה' },
  { id: 'watermark', label: 'ענק ושקוף ברקע', hint: 'נוכח אבל לא מתחרה בכותרת' },
  { id: 'strip', label: 'בעיגול על גבול הבאנר', hint: 'כמו חותמת בין הבאנר לתוכן' },
];

const DESIGN_ICONS = ['fa-medal', 'fa-truck-fast', 'fa-leaf', 'fa-handshake', 'fa-shield-heart', 'fa-hammer', 'fa-seedling', 'fa-star', 'fa-clock', 'fa-heart', 'fa-gem', 'fa-wand-magic-sparkles'];

// סדר המקטעים כברירת מחדל - וגם ההדרכה שמוצגת למוכר על כל אחד מהם
const DESIGN_SECTIONS = [
  { id: 'hero', label: 'באנר פתיחה', icon: 'fa-image', tip: 'המשפט שאומר בשנייה מה אתם מוכרים ולמי. לא "ברוכים הבאים" - אלא "קרמים מרפאים מצמחי הגליל".' },
  { id: 'perks', label: 'היתרונות שלי', icon: 'fa-medal', tip: 'שלוש סיבות לקנות דווקא אצלכם: ייצור עצמי? משלוח מהיר? ליווי אישי? זה המקום להבטחות שאתם עומדים בהן.' },
  { id: 'gallery', label: 'גלריית המוצרים', icon: 'fa-grip', tip: 'הלב של הדף. המוצרים נשלפים אוטומטית מהחנות - כאן בוחרים איך הם נראים.' },
  { id: 'reviews', label: 'המלצות', icon: 'fa-quote-right', tip: 'המלצה אמיתית עם שם עושה יותר מכל סיסמה. שלוש מספיקות - וכדאי שכל אחת תספר על מוצר אחר.' },
  { id: 'about', label: 'הסיפור שלי', icon: 'fa-user', tip: 'מי אתם, למה התחלתם ואיך אתם עובדים. אנשים קונים מאנשים.' },
  { id: 'contact', label: 'דברו איתי', icon: 'fa-comment-dots', tip: 'טלפון, וואטסאפ ואזור - הדרך הקצרה מהתעניינות להזמנה.' },
];

function sdEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function designStyle(id) {
  return DESIGN_STYLES.find(s => s.id === id) || DESIGN_STYLES[0];
}

/** עיצוב ברירת מחדל למוכר שנכנס לסטודיו בפעם הראשונה - מתמלא מפרטי החנות. */
function defaultDesign(store = {}) {
  // בלי שם (נרמול עיצוב שהגיע מהשרת בלי רשומת חנות) - הבאנר נופל לשם החנות
  const name = store.store_name || store.name || '';
  return {
    v: DESIGN_VERSION,
    style: 'aurora',
    accent: '',
    logoSpot: 'hero',
    order: DESIGN_SECTIONS.map(s => s.id),
    hero: {
      on: true,
      title: name,
      subtitle: store.store_description || store.description || '',
      cta: 'לכל המוצרים',
      image: '',
    },
    perks: {
      on: true,
      title: 'למה לקנות אצלי',
      items: [
        { icon: 'fa-medal', title: '', text: '' },
        { icon: 'fa-truck-fast', title: '', text: '' },
        { icon: 'fa-handshake', title: '', text: '' },
      ],
    },
    gallery: { on: true, title: 'המוצרים שלי', cols: 3, prices: true, cart: true },
    reviews: { on: false, title: 'לקוחות מספרים', items: [{ name: '', text: '', stars: 5 }] },
    about: { on: false, title: 'הסיפור שלי', text: '', image: '' },
    contact: { on: true, title: 'דברו איתי', text: '' },
  };
}

/** מיזוג עיצוב שמור על ברירת המחדל - כדי ששדה חדש לא ישבור עיצוב ישן. */
function normalizeDesign(raw, store) {
  const base = defaultDesign(store);
  if (!raw || typeof raw !== 'object') return base;
  const out = { ...base, ...raw };
  for (const key of ['hero', 'perks', 'gallery', 'reviews', 'about', 'contact']) {
    out[key] = { ...base[key], ...(raw[key] || {}) };
  }
  out.perks.items = Array.isArray(raw.perks?.items) && raw.perks.items.length ? raw.perks.items : base.perks.items;
  out.reviews.items = Array.isArray(raw.reviews?.items) && raw.reviews.items.length ? raw.reviews.items : base.reviews.items;
  const ids = DESIGN_SECTIONS.map(s => s.id);
  const order = Array.isArray(raw.order) ? raw.order.filter(id => ids.includes(id)) : [];
  out.order = [...order, ...ids.filter(id => !order.includes(id))];
  out.style = designStyle(out.style).id;
  out.v = DESIGN_VERSION;
  return out;
}

// --- שמירה מקומית (תמיד) ---
function getLocalDesign() {
  try { return JSON.parse(localStorage.getItem(DESIGN_KEY) || 'null'); } catch { return null; }
}
function setLocalDesign(design) {
  try { localStorage.setItem(DESIGN_KEY, JSON.stringify(design)); } catch { /* אחסון חסום */ }
}

/** שמירה בחשבון. השדה store_design עדיין לא קיים בכל התקנה של השרת, ולכן
 *  כישלון אינו שגיאה של המוכר: מחזירים saved=false והסטודיו אומר שהעיצוב
 *  שמור בדפדפן בלבד. */
async function saveDesignToAccount(store, design) {
  if (!store || typeof pickStoreFields !== 'function') return { saved: false, reason: 'no-store' };
  try {
    const body = { ...pickStoreFields(store), contract_accepted: true, contract_version: store.contract_version, store_design: JSON.stringify(design) };
    const r = await fetch('/api/store', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) return { saved: false, reason: 'server' };
    // שרת שמתעלם משדה שאינו מוכר יחזיר 200 בלי העיצוב - זה לא 'נשמר'
    const row = (await r.json().catch(() => ({}))).store;
    if (!row || !row.store_design) return { saved: false, reason: 'no-field' };
    return { saved: true };
  } catch {
    return { saved: false, reason: 'network' };
  }
}

/** העיצוב הציבורי של חנות מאושרת - מה שכל מבקר רואה. מחזיר null כשאין. */
async function fetchStoreDesign(slug, storeRow) {
  if (!slug) return null;
  try {
    const r = await fetch('/api/store-design?s=' + encodeURIComponent(slug));
    if (!r.ok) return null;
    const { design } = await r.json();
    if (!design) return null;
    return normalizeDesign(typeof design === 'string' ? JSON.parse(design) : design, storeRow);
  } catch {
    return null;
  }
}

/** העיצוב המקומי, כשהחנות שמוצגת היא החנות של מי שצופה: כך המוכר רואה את
 *  הדף שלו מיד (וגם לפני שהחנות אושרה). מה שפורסם נטען מהשרת בנפרד. */
function designForStore(storeRow) {
  const mine = typeof getSavedStore === 'function' ? getSavedStore() : null;
  const slug = mine ? (mine.slug || (typeof storeSlug === 'function' ? storeSlug(mine.store_name) : '')) : '';
  if (storeRow && slug && slug === storeRow.slug) {
    const local = getLocalDesign();
    if (local) return normalizeDesign(local, mine);
  }
  return null;
}

// ============================================================
// רינדור דף החנות המעוצב
// store: { name, logo, description, city, phone, whatsapp, website, products }
// opts.preview = תצוגה מקדימה בסטודיו (בלי הוספה לעגלה, בלי קישורים יוצאים)
// ============================================================
function designRootAttrs(design) {
  const st = designStyle(design.style);
  const v = st.vars;
  const accent = design.accent || v.accent;
  const style = [
    `--sp-bg:${v.bg}`, `--sp-surface:${v.surface}`, `--sp-text:${v.text}`, `--sp-muted:${v.muted}`,
    `--sp-accent:${accent}`, `--sp-accent2:${v.accent2}`, `--sp-border:${v.border}`,
    `--sp-radius:${v.radius}`, `--sp-font:${v.font}`, `--sp-weight:${v.weight}`, `--sp-shadow:${v.shadow}`,
  ].join(';');
  return `class="sp-page sp-hero-${st.hero} sp-logo-${design.logoSpot}" style="${style}"`;
}

function sdLogo(store, size) {
  const logo = store.logo || store.storeLogo || store.store_logo || '';
  const name = store.name || store.store_name || '?';
  return logo
    ? `<img class="sp-logo" src="${sdEsc(logo)}" alt="${sdEsc(name)}" style="width:${size}px;height:${size}px">`
    : `<span class="sp-logo sp-logo-letter" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px">${sdEsc(name.charAt(0))}</span>`;
}

function sdHero(store, design, opts) {
  const h = design.hero;
  const name = store.name || store.store_name || '';
  const bg = h.image ? `<div class="sp-hero-bg" style="background-image:url('${sdEsc(h.image)}')"></div>` : '';
  const logoHere = design.logoSpot === 'hero' ? `<div class="sp-hero-logo">${sdLogo(store, 108)}</div>` : '';
  const mark = design.logoSpot === 'watermark' ? `<div class="sp-watermark">${sdLogo(store, 320)}</div>` : '';
  const strip = design.logoSpot === 'strip' ? `<div class="sp-strip-logo">${sdLogo(store, 84)}</div>` : '';
  const cta = h.cta
    ? `<a class="sp-btn" href="#sp-gallery"${opts.preview ? ' onclick="return false"' : ''}>${sdEsc(h.cta)} <i class="fas fa-arrow-left"></i></a>`
    : '';
  return `
    <section class="sp-hero" id="sp-hero">
      ${bg}${mark}
      <div class="sp-hero-inner">
        ${logoHere}
        <h1>${sdEsc(h.title || name)}</h1>
        ${h.subtitle ? `<p class="sp-hero-sub">${sdEsc(h.subtitle)}</p>` : ''}
        ${cta}
      </div>
      ${strip}
    </section>`;
}

function sdPerks(store, design) {
  const items = design.perks.items.filter(it => (it.title || '').trim() || (it.text || '').trim());
  if (!items.length) return '';
  return `
    <section class="sp-sec sp-perks" id="sp-perks">
      ${design.perks.title ? `<h2>${sdEsc(design.perks.title)}</h2>` : ''}
      <div class="sp-perk-grid">
        ${items.map(it => `
          <div class="sp-perk">
            <span class="sp-perk-icon"><i class="fas ${sdEsc(it.icon || 'fa-star')}"></i></span>
            ${it.title ? `<h3>${sdEsc(it.title)}</h3>` : ''}
            ${it.text ? `<p>${sdEsc(it.text)}</p>` : ''}
          </div>`).join('')}
      </div>
    </section>`;
}

function sdGallery(store, design, opts) {
  const g = design.gallery;
  const list = store.products || [];
  if (!list.length) {
    return `
      <section class="sp-sec sp-gallery" id="sp-gallery">
        ${g.title ? `<h2>${sdEsc(g.title)}</h2>` : ''}
        <p class="sp-empty">כאן יופיעו המוצרים שלכם. ${opts.preview ? 'העלו מוצר ראשון והוא ייכנס לגלריה אוטומטית.' : ''}</p>
      </section>`;
  }
  return `
    <section class="sp-sec sp-gallery" id="sp-gallery">
      ${g.title ? `<h2>${sdEsc(g.title)}</h2>` : ''}
      <div class="sp-prod-grid" style="--sp-cols:${Number(g.cols) || 3}">
        ${list.map(p => {
          const cat = (typeof categories !== 'undefined' ? categories.find(c => c.id === p.category) : null) || {};
          const media = p.image
            ? `<img src="${sdEsc(p.image)}" alt="${sdEsc(p.name)}" loading="lazy">`
            : `<span class="sp-prod-emoji">${sdEsc(p.emoji || '📦')}</span>`;
          const buy = g.cart
            ? (opts.preview
              ? `<span class="sp-btn sp-btn-sm">לעגלה</span>`
              : `<button type="button" class="sp-btn sp-btn-sm" onclick="addToCart(${Number(p.id)})">לעגלה</button>`)
            : '';
          const open = opts.preview ? '' : ` onclick="openQuickView(${Number(p.id)})"`;
          return `
            <article class="sp-prod">
              <div class="sp-prod-media"${open}>${media}</div>
              <div class="sp-prod-body">
                ${cat.name ? `<span class="sp-prod-cat">${sdEsc(cat.name)}</span>` : ''}
                <h3>${sdEsc(p.name)}</h3>
                <div class="sp-prod-row">
                  ${g.prices ? `<span class="sp-prod-price">₪${sdEsc(p.price)}</span>` : ''}
                  ${buy}
                </div>
              </div>
            </article>`;
        }).join('')}
      </div>
    </section>`;
}

function sdReviews(store, design) {
  const items = design.reviews.items.filter(it => (it.text || '').trim());
  if (!items.length) return '';
  return `
    <section class="sp-sec sp-reviews" id="sp-reviews">
      ${design.reviews.title ? `<h2>${sdEsc(design.reviews.title)}</h2>` : ''}
      <div class="sp-review-grid">
        ${items.map(it => `
          <blockquote class="sp-review">
            <span class="sp-stars">${'★'.repeat(Math.max(1, Math.min(5, Number(it.stars) || 5)))}</span>
            <p>${sdEsc(it.text)}</p>
            ${it.name ? `<footer>${sdEsc(it.name)}</footer>` : ''}
          </blockquote>`).join('')}
      </div>
    </section>`;
}

function sdAbout(store, design) {
  const a = design.about;
  if (!(a.text || '').trim() && !a.image) return '';
  return `
    <section class="sp-sec sp-about" id="sp-about">
      <div class="sp-about-inner${a.image ? ' has-image' : ''}">
        <div>
          ${a.title ? `<h2>${sdEsc(a.title)}</h2>` : ''}
          ${a.text ? `<p>${sdEsc(a.text).replace(/\n+/g, '</p><p>')}</p>` : ''}
        </div>
        ${a.image ? `<div class="sp-about-img"><img src="${sdEsc(a.image)}" alt="${sdEsc(store.name || '')}" loading="lazy"></div>` : ''}
      </div>
    </section>`;
}

function sdContact(store, design, opts) {
  const c = design.contact;
  const wa = typeof waLink === 'function' ? waLink(store.whatsapp || store.phone) : '';
  const href = u => (opts.preview ? '#' : u);
  const stop = opts.preview ? ' onclick="return false"' : '';
  const chips = [
    store.city ? `<span class="sp-chip"><i class="fas fa-location-dot"></i> ${sdEsc(store.city)}</span>` : '',
    store.phone ? `<a class="sp-chip" href="${href('tel:' + sdEsc(store.phone))}"${stop}><i class="fas fa-phone"></i> ${sdEsc(store.phone)}</a>` : '',
    wa ? `<a class="sp-chip sp-chip-wa" href="${href(wa)}" target="_blank" rel="noopener"${stop}><i class="fab fa-whatsapp"></i> וואטסאפ</a>` : '',
    store.website ? `<a class="sp-chip" href="${href(sdEsc(store.website))}" target="_blank" rel="noopener"${stop}><i class="fas fa-globe"></i> האתר שלי</a>` : '',
  ].filter(Boolean).join('');
  if (!chips && !(c.text || '').trim()) return '';
  return `
    <section class="sp-sec sp-contact" id="sp-contact">
      ${c.title ? `<h2>${sdEsc(c.title)}</h2>` : ''}
      ${c.text ? `<p class="sp-contact-text">${sdEsc(c.text)}</p>` : ''}
      <div class="sp-chips">${chips}</div>
    </section>`;
}

function sdTopBar(store, design, opts) {
  if (design.logoSpot !== 'corner') return '';
  return `
    <header class="sp-top">
      ${sdLogo(store, 46)}
      <span class="sp-top-name">${sdEsc(store.name || store.store_name || '')}</span>
      ${store.phone ? `<a class="sp-top-phone" href="${opts.preview ? '#' : 'tel:' + sdEsc(store.phone)}"${opts.preview ? ' onclick="return false"' : ''}><i class="fas fa-phone"></i> ${sdEsc(store.phone)}</a>` : ''}
    </header>`;
}

/** בונה את ה-HTML של דף החנות המעוצב. */
function renderStoreDesignHtml(store, rawDesign, opts = {}) {
  const design = normalizeDesign(rawDesign, store);
  const builders = {
    hero: () => (design.hero.on ? sdHero(store, design, opts) : ''),
    perks: () => (design.perks.on ? sdPerks(store, design) : ''),
    gallery: () => (design.gallery.on ? sdGallery(store, design, opts) : ''),
    reviews: () => (design.reviews.on ? sdReviews(store, design) : ''),
    about: () => (design.about.on ? sdAbout(store, design) : ''),
    contact: () => (design.contact.on ? sdContact(store, design, opts) : ''),
  };
  const body = design.order.map(id => builders[id]?.() || '').join('');
  return `<div ${designRootAttrs(design)}>${sdTopBar(store, design, opts)}${body}</div>`;
}

/** מרנדר לתוך מיכל. */
function renderStoreDesign(container, store, design, opts = {}) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) return;
  el.innerHTML = renderStoreDesignHtml(store, design, opts);
}
