const { STRAPI_URL, readCookie, isSuperAdminUser } = require('./_shared');

// מחזיר את המשתמש המחובר לפי העוגייה המשותפת gofreeil-auth (או null).
module.exports = async (req, res) => {
	const jwt = readCookie(req.headers.cookie, 'gofreeil-auth');
	if (!jwt) return res.status(200).json({ user: null });
	try {
		const r = await fetch(STRAPI_URL + '/api/users/me', { headers: { Authorization: `Bearer ${jwt}` } });
		if (!r.ok) return res.status(200).json({ user: null });
		const u = await r.json();
		// superAdmin מדליק את עורך התוכן באתר (js/site-editor.js); הכתיבה עצמה נאכפת ב-Strapi
		return res.status(200).json({ user: { name: u.username, email: u.email, superAdmin: isSuperAdminUser(u) } });
	} catch {
		return res.status(200).json({ user: null });
	}
};
