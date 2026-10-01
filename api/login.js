const { STRAPI_URL, setSharedCookie, clearSharedCookie, parseBody, isSuperAdminUser, friendlyName, avatarUrl } = require('./_shared');

// ---- שחזור גישה לחשבון ----
// ה-Strapi שולח את המייל; מוסרים לו את כתובת דף האיפוס של החנות כדי שהקישור במייל יחזיר לכאן.
// שרת ישן שדוחה שדה לא מוכר (resetUrl) ב-400 - מנסים שוב בלעדיו.
async function strapiPost(path, payload) {
	return fetch(STRAPI_URL + path, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
		signal: AbortSignal.timeout(10_000)
	});
}

async function forgotPassword(req, res, body) {
	const email = String(body.email || '').trim();
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: 'bad_email' });
	const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
	try {
		let r = await strapiPost('/api/auth/forgot-password', { email, resetUrl: `https://${host}/reset-password` });
		if (r.status === 400) r = await strapiPost('/api/auth/forgot-password', { email });
		if (r.status === 429) return res.status(429).json({ error: 'rate' });
		if (!r.ok) return res.status(503).json({ error: 'server' });
		// תשובה זהה גם כשהאימייל לא רשום - לא מגלים מי רשום
		return res.status(200).json({ ok: true });
	} catch {
		return res.status(503).json({ error: 'server' });
	}
}

async function resetPassword(res, body) {
	const code = String(body.code || '').trim();
	const password = String(body.password || '');
	if (!code) return res.status(400).json({ error: 'expired' });
	if (password.length < 6) return res.status(400).json({ error: 'short' });
	try {
		const r = await strapiPost('/api/auth/reset-password', { code, password, passwordConfirmation: password });
		if (r.status === 429) return res.status(429).json({ error: 'rate' });
		if (r.status >= 500) return res.status(503).json({ error: 'server' });
		if (!r.ok) return res.status(400).json({ error: 'expired' });
		const data = await r.json();
		if (!data?.jwt) return res.status(503).json({ error: 'server' });
		// הסיסמה נקבעה = המשתמש הוכיח בעלות על המייל: נכנס מיד, בכל אתרי הרשת
		setSharedCookie(res, data.jwt);
		return res.status(200).json({ user: { name: friendlyName(data.user), email: data.user.email, avatar: avatarUrl(data.user), superAdmin: isSuperAdminUser(data.user) } });
	} catch {
		return res.status(503).json({ error: 'server' });
	}
}

// התחברות אימייל+סיסמה מול ה-Strapi המשותף; מצליח → שותל את העוגייה המשותפת.
module.exports = async (req, res) => {
	// התנתקות (/api/logout מופנה לכאן ב-vercel.json) - מוחק את העוגייה המשותפת
	// ומתנתק מכל אתרי יוצאים לחירות. אוחד לכאן כי בתוכנית של Vercel מותרות עד
	// 12 פונקציות שרת, ופונקציה שלוש-עשרה מפילה כל פריסה.
	if (req.query?.logout) {
		clearSharedCookie(res);
		return res.status(200).json({ ok: true });
	}
	if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
	const body = parseBody(req);
	// שחזור גישה לחשבון (?forgot=1 / ?reset=1) - מאוחד לכאן מאותה סיבה: מגבלת 12 הפונקציות
	if (req.query?.forgot) return forgotPassword(req, res, body);
	if (req.query?.reset) return resetPassword(res, body);
	const email = (body.email || '').trim().toLowerCase();
	const password = body.password || '';
	if (!email || !password) return res.status(400).json({ error: 'missing' });
	try {
		const r = await fetch(STRAPI_URL + '/api/auth/local', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ identifier: email, password })
		});
		if (!r.ok) return res.status(401).json({ error: 'bad_credentials' });
		const data = await r.json();
		setSharedCookie(res, data.jwt);
		return res.status(200).json({ user: { name: friendlyName(data.user), email: data.user.email, avatar: avatarUrl(data.user), superAdmin: isSuperAdminUser(data.user) } });
	} catch {
		return res.status(500).json({ error: 'server' });
	}
};
