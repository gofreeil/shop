// עוזרים משותפים לפונקציות ה-serverless של החנות מול ה-Strapi המשותף של יוצאים לחירות.
const STRAPI_URL = 'https://api.gofreeil.com';

function readCookie(cookieHeader, name) {
	if (!cookieHeader) return null;
	for (const part of cookieHeader.split(';')) {
		const idx = part.indexOf('=');
		if (idx === -1) continue;
		if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
	}
	return null;
}

// שותל את העוגייה המשותפת gofreeil-auth על .gofreeil.com — כך המשתמש מזוהה בכל האתרים.
function setSharedCookie(res, jwt) {
	res.setHeader('Set-Cookie', [
		`gofreeil-auth=${jwt}`,
		'Path=/',
		'Domain=.gofreeil.com',
		'HttpOnly',
		'Secure',
		'SameSite=Lax',
		`Max-Age=${60 * 60 * 24 * 365}`
	].join('; '));
}

function clearSharedCookie(res) {
	res.setHeader('Set-Cookie', [
		'gofreeil-auth=',
		'Path=/',
		'Domain=.gofreeil.com',
		'HttpOnly',
		'Secure',
		'SameSite=Lax',
		'Max-Age=0'
	].join('; '));
}

function parseBody(req) {
	let body = req.body;
	if (typeof body === 'string') {
		try { body = JSON.parse(body); } catch { body = {}; }
	}
	return body || {};
}

// כותרות לקריאה ל-Strapi בשם המשתמש (JWT מהעוגייה המשותפת, אם יש)
function authHeaders(req) {
	const jwt = readCookie(req.headers.cookie, 'gofreeil-auth');
	const h = { 'Content-Type': 'application/json' };
	if (jwt) h.Authorization = `Bearer ${jwt}`;
	return h;
}

// אותם כללי אמון כמו ב-controllers בשרת: super_admin / shop_admin לפי app_role.
const SHOP_ADMIN_ROLES = new Set(['super_admin', 'shop_admin']);
async function isShopAdmin(req) {
	const jwt = readCookie(req.headers.cookie, 'gofreeil-auth');
	if (!jwt) return false;
	try {
		const r = await fetch(STRAPI_URL + '/api/users/me', { headers: { Authorization: `Bearer ${jwt}` }, signal: AbortSignal.timeout(10_000) });
		if (!r.ok) return false;
		const u = await r.json();
		return SHOP_ADMIN_ROLES.has(u?.app_role) || String(u?.email || '').toLowerCase() === 'yahavanter@gmail.com';
	} catch {
		return false;
	}
}

// סופר-אדמין (עורך את תוכן האתר מתוך הדפים) - אותו כלל כמו ב-controller של
// shop-site-override ב-Strapi: app_role של super_admin או האימייל הקבוע.
function isSuperAdminUser(u) {
	return u?.app_role === 'super_admin' || String(u?.email || '').toLowerCase() === 'yahavanter@gmail.com';
}

// משתמשי OAuth נשמרים ב-Strapi המשותף עם username בצורת "google_1164…" - מזהה-מכונה,
// לא שם. אותו כלל כמו בשאר האתרים (קהילה בשכונה, קבוצות רכישה): לעולם לא להציג אותו.
function isMachineUsername(name) {
	return /^(google|facebook|apple|community|local)[_-]/i.test(String(name || '').trim()) || /^[a-z][a-z0-9]*[_-]d{5,}$/i.test(String(name || '').trim());
}

// שם תצוגה: שם אמיתי אם קיים על הרשומה ← username אנושי ← החלק שלפני ה-@ באימייל ← "משתמש"
function friendlyName(u) {
	const full = [u?.firstname, u?.lastname].filter(Boolean).join(' ').trim();
	const real = String(u?.name || u?.displayName || u?.display_name || full || u?.username || '').trim();
	if (real && !real.includes('@') && !isMachineUsername(real)) return real;
	const local = String(u?.email || '').split('@')[0].trim();
	if (!local) return 'משתמש';
	return local.split(/[._-]+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// תמונת פרופיל: השדה ששמור ב-Strapi המשותף (מגוגל / העלאה בקהילה), ואם אין - Gravatar
// עם identicon ייחודי לפי האימייל, כמו בשאר האתרים.
function avatarUrl(u) {
	const stored = u?.avatar_url || u?.picture || u?.avatar || u?.image || '';
	if (typeof stored === 'string' && stored.startsWith('http') && stored.indexOf('://') > 0) return stored;
	const email = String(u?.email || '').trim().toLowerCase();
	if (!email) return null;
	const hash = require('crypto').createHash('md5').update(email).digest('hex');
	return `https://www.gravatar.com/avatar/${hash}?s=160&d=identicon`;
}

// קריאה ל-Strapi עם timeout; מחזיר {ok, status, json}
async function strapiFetch(url, init) {
	const r = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
	let json = null;
	try { json = await r.json(); } catch { /* גוף ריק */ }
	return { ok: r.ok, status: r.status, json };
}

module.exports = { STRAPI_URL, readCookie, setSharedCookie, clearSharedCookie, parseBody, authHeaders, isShopAdmin, isSuperAdminUser, isMachineUsername, friendlyName, avatarUrl, strapiFetch };
