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

module.exports = { STRAPI_URL, readCookie, setSharedCookie, clearSharedCookie, parseBody };
