const { STRAPI_URL, readCookie, parseBody, authHeaders, isShopAdmin, strapiFetch: strapi } = require('./_shared');

// החנות של המוכר המחובר בקניון השיתופי - פרוקסי ל-content type shop-stores
// ב-Strapi (community-backend/src/api/shop-store). רשומה אחת למשתמש, נשמרת בשלב
// "פתיחת חנות" (sell.html) לפני העלאת מוצרים (add-product.html).
//
//   GET  /api/store          החנות של המשתמש המחובר: { store } (null אם אין; guest=true בלי התחברות)
//   GET  /api/store?all=1    כל החנויות שנפתחו, ללוח הבקרה של המנהל (מנהל חנות בלבד)
//   GET  /api/store?count=1  כמה חנויות ממתינות לאישור - לתג ההתראה בכותרת (מנהל חנות בלבד)
//   PUT  /api/store          אישור/דחיית חנות { documentId, status, rejection_reason } (מנהל חנות בלבד)
//   POST /api/store          פתיחה / עדכון (upsert) - דורש התחברות; תיעוד קבלת ההסכם נחתם בשרת
//
// אורח (בלי עוגייה) שומר את החנות בדפדפן בלבד; ברגע שיתחבר, הדף מסנכרן אותה לשרת.
const ENDPOINT = STRAPI_URL + '/api/shop-stores';

function clientIp(req) {
	const xf = req.headers['x-forwarded-for'];
	if (typeof xf === 'string' && xf) return xf.split(',')[0].trim();
	return req.headers['x-real-ip'] || req.socket?.remoteAddress || '';
}

module.exports = async (req, res) => {
	try {
		const jwt = readCookie(req.headers.cookie, 'gofreeil-auth');
		if (req.method === 'GET') {
			if (req.query?.count) {
				// רק המספר: כמה חנויות ממתינות לאישור - לתג ההתראה בכותרת האתר.
				// בלי גוף הרשומות (הלוגואים כבדים), רק meta.pagination.total.
				if (!(await isShopAdmin(req))) return res.status(403).json({ error: 'forbidden' });
				const url = ENDPOINT + '?filters[status][$eq]=pending&fields[0]=id&pagination[pageSize]=1';
				const r = await strapi(url, { headers: authHeaders(req) });
				if (!r.ok) return res.status(r.status === 401 || r.status === 403 ? 403 : 502).json({ error: 'forbidden' });
				return res.status(200).json({ pending: r.json?.meta?.pagination?.total ?? 0 });
			}
			if (req.query?.all) {
				if (!(await isShopAdmin(req))) return res.status(403).json({ error: 'forbidden' });
				const r = await strapi(ENDPOINT + '?sort=store_name:asc&pagination[pageSize]=200', { headers: authHeaders(req) });
				if (!r.ok) return res.status(r.status === 401 || r.status === 403 ? 403 : 502).json({ error: 'forbidden' });
				return res.status(200).json({ stores: r.json?.data ?? [] });
			}
			if (!jwt) return res.status(200).json({ store: null, guest: true });
			const r = await strapi(ENDPOINT + '/mine', { headers: authHeaders(req) });
			if (r.status === 401 || r.status === 403) return res.status(200).json({ store: null, guest: true });
			if (!r.ok) return res.status(502).json({ error: 'server' });
			return res.status(200).json({ store: r.json?.data ?? null });
		}

		if (req.method === 'POST') {
			if (!jwt) return res.status(401).json({ error: 'נדרשת התחברות כדי לשמור את החנות בחשבון' });
			const body = parseBody(req);
			const data = { ...body, contract_ip: clientIp(req) };
			const r = await strapi(ENDPOINT + '/upsert', {
				method: 'POST',
				headers: authHeaders(req),
				body: JSON.stringify({ data })
			});
			if (!r.ok) {
				const msg = r.json?.error?.message || 'השמירה נכשלה';
				return res.status(r.status >= 500 ? 502 : r.status).json({ error: msg });
			}
			return res.status(200).json({ store: r.json?.data ?? null, created: !!r.json?.created });
		}

		if (req.method === 'PUT') {
			// אישור / דחייה של חנות - מנהל חנות בלבד (נאכף שוב ב-Strapi).
			// אישור חנות מעלה למדף אוטומטית את כל מוצריה שממתינים.
			if (!(await isShopAdmin(req))) return res.status(403).json({ error: 'forbidden' });
			const body = parseBody(req);
			const documentId = String(body.documentId || '').trim();
			if (!documentId) return res.status(400).json({ error: 'missing id' });
			const data = {};
			if (['pending', 'approved', 'rejected'].includes(body.status)) data.status = body.status;
			if (typeof body.rejection_reason === 'string') data.rejection_reason = body.rejection_reason;
			if (!Object.keys(data).length) return res.status(400).json({ error: 'אין מה לעדכן' });
			const r = await strapi(`${ENDPOINT}/${encodeURIComponent(documentId)}`, {
				method: 'PUT',
				headers: authHeaders(req),
				body: JSON.stringify({ data })
			});
			if (!r.ok) return res.status(r.status === 401 || r.status === 403 ? 403 : 502).json({ error: r.json?.error?.message || 'failed' });
			return res.status(200).json({ store: r.json?.data ?? null });
		}

		return res.status(405).json({ error: 'method' });
	} catch {
		return res.status(500).json({ error: 'server' });
	}
};
