const { STRAPI_URL, parseBody, authHeaders, strapiFetch: strapi } = require('./_shared');

// תגובות על מוצרים - פרוקסי ל-shop-product-comments ב-Strapi המשותף
// (community-backend/src/api/shop-product-comment).
//
//   GET    /api/comments?product=<id>   התגובות למוצר (ציבורי; מחובר מקבל canDelete לתגובות שלו)
//   POST   /api/comments                { product_id, body } - משתמש מחובר בלבד (Strapi אוכף)
//   DELETE /api/comments?id=<docId>     הכותב או מנהל חנות (Strapi אוכף)
const ENDPOINT = STRAPI_URL + '/api/shop-product-comments';

function fail(res, r, fallback) {
	const status = r.status === 401 ? 401 : r.status === 403 ? 403 : r.status === 400 ? 400 : 502;
	return res.status(status).json({ error: r.json?.error?.message || fallback });
}

module.exports = async (req, res) => {
	res.setHeader('Cache-Control', 'no-store');
	try {
		if (req.method === 'GET') {
			const product = Number(req.query?.product);
			if (!Number.isInteger(product) || product <= 0) return res.status(400).json({ error: 'product' });
			const r = await strapi(`${ENDPOINT}?product=${product}`, { headers: authHeaders(req) });
			if (!r.ok) return res.status(200).json({ items: [] });
			return res.status(200).json({ items: r.json?.data ?? [] });
		}

		if (req.method === 'POST') {
			const b = parseBody(req);
			const r = await strapi(ENDPOINT, {
				method: 'POST',
				headers: authHeaders(req),
				body: JSON.stringify({ data: { product_id: Number(b.product_id), body: String(b.body || '').slice(0, 2000) } })
			});
			if (!r.ok) return fail(res, r, 'שליחת התגובה נכשלה');
			return res.status(200).json({ item: r.json?.data ?? null });
		}

		if (req.method === 'DELETE') {
			const id = String(req.query?.id || '').trim();
			if (!/^[a-z0-9]{10,40}$/i.test(id)) return res.status(400).json({ error: 'id' });
			const r = await strapi(`${ENDPOINT}/${id}`, { method: 'DELETE', headers: authHeaders(req) });
			if (!r.ok) return fail(res, r, 'המחיקה נכשלה');
			return res.status(200).json({ ok: true });
		}

		return res.status(405).json({ error: 'method' });
	} catch {
		return res.status(500).json({ error: 'server' });
	}
};
