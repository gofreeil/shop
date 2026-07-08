const { STRAPI_URL, readCookie } = require('./_shared');

// מחזיר את המשתמש המחובר לפי העוגייה המשותפת gofreeil-auth (או null).
module.exports = async (req, res) => {
	const jwt = readCookie(req.headers.cookie, 'gofreeil-auth');
	if (!jwt) return res.status(200).json({ user: null });
	try {
		const r = await fetch(STRAPI_URL + '/api/users/me', { headers: { Authorization: `Bearer ${jwt}` } });
		if (!r.ok) return res.status(200).json({ user: null });
		const u = await r.json();
		return res.status(200).json({ user: { name: u.username, email: u.email } });
	} catch {
		return res.status(200).json({ user: null });
	}
};
