const { STRAPI_URL, parseBody, authHeaders, strapiFetch: strapi } = require('./_shared');

// דירוגים ותגובות על מוצרים - פרוקסי ל-shop-product-comments ב-Strapi המשותף
// (community-backend/src/api/shop-product-comment). אותו מודל כמו דירוגי
// שביעות הרצון בקבוצות הרכישה: דירוג 1-5 + תגובה, לייק, תגובה-לתגובה, תשובת מנהל.
//
//   GET    /api/comments?summary=1              { <productId>: [ממוצע, מספר] } (ציבורי, ממוטמן ב-CDN)
//   GET    /api/comments?product=<id>           הדירוגים של מוצר (מחובר מקבל liked/mine/canDelete)
//   POST   /api/comments                        { product_id, rating, body } - מחובר בלבד
//   POST   /api/comments?id=<docId>&action=like   לייק (toggle) - מחובר
//   POST   /api/comments?id=<docId>&action=reply  { text } - מחובר
//   PUT    /api/comments?id=<docId>             { is_featured, admin_liked, admin_reply } - מנהל
//   DELETE /api/comments?id=<docId>             הכותב או מנהל
// ההרשאות נאכפות ב-Strapi לפי ה-JWT שבעוגייה המשותפת.
const ENDPOINT = STRAPI_URL + '/api/shop-product-comments';

function fail(res, r, fallback) {
	const status = [400, 401, 403, 404].includes(r.status) ? r.status : 502;
	return res.status(status).json({ error: r.json?.error?.message || fallback });
}
const validId = id => /^[a-z0-9]{10,40}$/i.test(id);

module.exports = async (req, res) => {
	res.setHeader('Cache-Control', 'no-store');
	try {
		const id = String(req.query?.id || '').trim();

		if (req.method === 'GET') {
			if (req.query?.summary) {
				const r = await strapi(`${ENDPOINT}/summary`, { headers: { 'Content-Type': 'application/json' } });
				if (!r.ok) return res.status(200).json({ ratings: {} });
				res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
				return res.status(200).json({ ratings: r.json?.data ?? {} });
			}
			const product = Number(req.query?.product);
			if (!Number.isInteger(product) || product <= 0) return res.status(400).json({ error: 'product' });
			const r = await strapi(`${ENDPOINT}?product=${product}`, { headers: authHeaders(req) });
			if (!r.ok) return res.status(200).json({ items: [], average: 0, count: 0 });
			return res.status(200).json({ items: r.json?.data ?? [], average: r.json?.meta?.average ?? 0, count: r.json?.meta?.count ?? 0, isAdmin: !!r.json?.isAdmin });
		}

		if (req.method === 'POST') {
			const b = parseBody(req);
			if (id) {
				if (!validId(id)) return res.status(400).json({ error: 'id' });
				const action = req.query?.action;
				if (action !== 'like' && action !== 'reply') return res.status(400).json({ error: 'action' });
				const r = await strapi(`${ENDPOINT}/${id}/${action}`, {
					method: 'POST',
					headers: authHeaders(req),
					body: JSON.stringify({ data: action === 'reply' ? { text: String(b.text || '').slice(0, 2000) } : {} })
				});
				if (!r.ok) return fail(res, r, action === 'like' ? 'שמירת הלייק נכשלה' : 'שליחת התגובה נכשלה');
				return res.status(200).json(r.json || {});
			}
			const r = await strapi(ENDPOINT, {
				method: 'POST',
				headers: authHeaders(req),
				body: JSON.stringify({ data: { product_id: Number(b.product_id), rating: Number(b.rating), body: String(b.body || '').slice(0, 2000) } })
			});
			if (!r.ok) return fail(res, r, 'השליחה נכשלה');
			return res.status(200).json({ item: r.json?.data ?? null, updated: !!r.json?.updated });
		}

		if (req.method === 'PUT') {
			if (!validId(id)) return res.status(400).json({ error: 'id' });
			const b = parseBody(req);
			const data = {};
			for (const k of ['is_featured', 'admin_liked', 'admin_reply']) if (k in b) data[k] = b[k];
			const r = await strapi(`${ENDPOINT}/${id}`, { method: 'PUT', headers: authHeaders(req), body: JSON.stringify({ data }) });
			if (!r.ok) return fail(res, r, 'העדכון נכשל');
			return res.status(200).json({ item: r.json?.data ?? null });
		}

		if (req.method === 'DELETE') {
			if (!validId(id)) return res.status(400).json({ error: 'id' });
			const r = await strapi(`${ENDPOINT}/${id}`, { method: 'DELETE', headers: authHeaders(req) });
			if (!r.ok) return fail(res, r, 'המחיקה נכשלה');
			return res.status(200).json({ ok: true });
		}

		return res.status(405).json({ error: 'method' });
	} catch {
		return res.status(500).json({ error: 'server' });
	}
};
