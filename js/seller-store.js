// החנות של המוכר בצד הלקוח - משותף ל-sell.html (פתיחת חנות / עריכת פרטיה)
// ול-add-product.html (העלאת מוצרים לחנות).
//
// הרשומה נשמרת ב-localStorage (noshop_store) תמיד, ובחשבון (api/store.js ->
// shop-stores ב-Strapi) כשהמשתמש מחובר. synced=true = הרשומה המקומית משקפת את
// השרת. כל מוצר שמועלה מעתיק ממנה את פרטי החנות, המוכר וההסכם.
const STORE_PUBLIC_FIELDS = ['store_name', 'store_phone', 'store_whatsapp', 'store_city', 'store_website', 'store_description'];
const STORE_SELLER_FIELDS = ['seller_name', 'seller_id_number', 'seller_phone', 'seller_email', 'seller_address'];
const STORE_CONTRACT_FIELDS = ['contract_accepted', 'contract_version', 'contract_accepted_at'];
const STORE_KEY = 'noshop_store';
const STORE_DRAFT_KEY = 'noshop_store_draft';

function getSavedStore() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    return s && s.store_name ? s : null;
  } catch { return null; }
}
function setSavedStore(s) {
  try {
    if (s) localStorage.setItem(STORE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORE_KEY);
  } catch { /* אחסון חסום */ }
}
// טיוטת הטופס (לפני פתיחת החנות) - כדי שרענון לא ימחק מה שהוקלד
function getStoreDraft() {
  try { return JSON.parse(localStorage.getItem(STORE_DRAFT_KEY) || 'null'); } catch { return null; }
}
function saveStoreDraft(d) {
  try { localStorage.setItem(STORE_DRAFT_KEY, JSON.stringify(d)); } catch { /* ignore */ }
}
function clearStoreDraft() {
  try { localStorage.removeItem(STORE_DRAFT_KEY); } catch { /* ignore */ }
}

// תג מצב החנות - מוצג בכל מקום שבו המוכר רואה את החנות שלו (פתיחת חנות,
// העלאת מוצר, האזור האישי, לוח הבקרה). זה הסטטוס היחיד שקובע: מנהל הקניון
// מאשר חנות, לא מוצר, ואישורה מעלה למדף את כל מוצריה.
function storeStatusPill(store) {
  if (!store) return { cls: '', icon: 'fa-circle-check', label: 'החנות פתוחה', title: '' };
  if (!store.synced) return { cls: 'local', icon: 'fa-mobile-screen', label: 'שמורה בדפדפן זה', title: 'התחברו כדי לשמור את החנות בחשבון ולשלוח אותה לאישור' };
  if (store.status === 'rejected') return { cls: 'rejected', icon: 'fa-circle-xmark', label: 'לא אושרה', title: store.rejection_reason || 'תקנו את פרטי החנות ושלחו שוב לאישור' };
  if (store.status === 'approved') return { cls: '', icon: 'fa-circle-check', label: 'החנות פתוחה', title: 'מאושרת - כל מוצר שתעלו עולה למדף מיד' };
  return { cls: 'pending', icon: 'fa-clock', label: 'ממתינה לאישור', title: 'ברגע שהחנות תאושר כל המוצרים שהעליתם יעלו למדף יחד' };
}
function storeStatusPillHtml(store) {
  const p = storeStatusPill(store);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  return `<span class="store-open-pill${p.cls ? ' ' + p.cls : ''}" title="${esc(p.title)}"><i class="fas ${p.icon}"></i> ${esc(p.label)}</span>`;
}

function pickStoreFields(src) {
  const out = {};
  [...STORE_PUBLIC_FIELDS, ...STORE_SELLER_FIELDS].forEach(k => { out[k] = src?.[k] || ''; });
  out.store_logo = src?.store_logo || '';
  return out;
}
// רשומת שרת -> רשומה מקומית. status הוא לב העניין: מנהל הקניון מאשר חנות
// (ולא מוצר), ואישורה מעלה למדף אוטומטית את כל מוצריה.
function storeFromServer(row) {
  if (!row) return null;
  return {
    ...pickStoreFields(row),
    contract_accepted: !!row.contract_accepted,
    contract_version: row.contract_version || '',
    contract_accepted_at: row.contract_accepted_at || null,
    opened_at: row.opened_at || row.createdAt || null,
    slug: row.slug || '',
    documentId: row.documentId || null,
    status: row.status || 'pending',
    rejection_reason: row.rejection_reason || '',
    decided_at: row.decided_at || null,
    synced: true,
  };
}
// מוכר ותיק שהגיש מוצרים לפני שהייתה רשומת חנות - משחזרים את החנות מההגשה האחרונה
function storeFromSubmission(item) {
  if (!item || !item.store_name) return null;
  return {
    ...pickStoreFields(item),
    contract_accepted: !!item.contract_accepted,
    contract_version: item.contract_version || '',
    contract_accepted_at: item.contract_accepted_at || null,
    opened_at: item.submitted_at || item.createdAt || null,
    // מוכר ותיק בלי רשומת חנות: מוצר מאושר שלו מעיד שהחנות מאושרת
    status: item.status === 'approved' ? 'approved' : 'pending',
    rejection_reason: '',
    decided_at: item.decided_at || null,
    synced: false,
  };
}

async function fetchAccountStore() {
  const r = await fetch('/api/store');
  if (!r.ok) throw new Error('server');
  return r.json();
}
// שמירה בחשבון (upsert). מחזיר את הרשומה כפי שנשמרה בשרת; זורק Error עם הודעה לתצוגה.
async function saveStoreToAccount(record) {
  const body = { ...pickStoreFields(record), contract_accepted: true, contract_version: record.contract_version };
  const r = await fetch('/api/store', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json.error || 'שמירת החנות נכשלה');
  return storeFromServer(json.store) || { ...record, synced: true };
}
// בכניסת משתמש: החנות שבחשבון גוברת על המקומית; חנות שנפתחה כאורח (מקומית בלבד)
// מועלית לחשבון. מחזיר true אם הרשומה המקומית השתנתה.
async function syncStoreWithAccount() {
  try {
    const { store, guest } = await fetchAccountStore();
    if (guest) return false;
    if (store) {
      const local = getSavedStore();
      const next = storeFromServer(store);
      if (JSON.stringify(local) === JSON.stringify(next)) return false;
      setSavedStore(next);
      return true;
    }
    const local = getSavedStore();
    if (local && !local.synced && local.contract_accepted && local.contract_version) {
      try { setSavedStore(await saveStoreToAccount(local)); return true; } catch { return false; }
    }
    return false;
  } catch { return false; }
}
