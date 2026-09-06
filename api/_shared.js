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

// קריאה ל-Strapi עם timeout; מחזיר {ok, status, json}
async function strapiFetch(url, init) {
	const r = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
	let json = null;
	try { json = await r.json(); } catch { /* גוף ריק */ }
	return { ok: r.ok, status: r.status, json };
}

module.exports = { STRAPI_URL, readCookie, setSharedCookie, clearSharedCookie, parseBody, authHeaders, isShopAdmin, strapiFetch };
