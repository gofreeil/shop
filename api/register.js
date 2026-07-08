const { STRAPI_URL, setSharedCookie, parseBody } = require('./_shared');

// הרשמה מול ה-Strapi המשותף; מצליח → שותל את העוגייה המשותפת ומחזיר את המשתמש.
module.exports = async (req, res) => {
	if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
	const body = parseBody(req);
	const email = (body.email || '').trim().toLowerCase();
	const password = body.password || '';
	const name = (body.name || '').trim() || email.split('@')[0];
	if (!email || !password) return res.status(400).json({ error: 'missing' });
	try {
		const r = await fetch(STRAPI_URL + '/api/auth/local/register', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username: name, email, password })
		});
		if (!r.ok) return res.status(400).json({ error: 'taken' });
		const data = await r.json();
		setSharedCookie(res, data.jwt);
		return res.status(200).json({ user: { name: data.user.username, email: data.user.email } });
	} catch {
		return res.status(500).json({ error: 'server' });
	}
};
