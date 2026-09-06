const { STRAPI_URL, parseBody, authHeaders, isShopAdmin, strapiFetch } = require('./_shared');

// הזמנות החנות - פרוקסי ל-shop-orders ב-Strapi המשותף
// (community-backend/src/api/shop-order). ההתראות על כל רכישה (מנהלים: תיבה +
// SMS + מייל; מוכרים: מייל אספקה; לקוח: אישור) נשלחות שם ב-afterCreate.
//
//   POST /api/orders           יצירת הזמנה מהצ'קאאוט (ציבורי)
//   GET  /api/orders?all=1     כל ההזמנות לפאנל (מנהל חנות בלבד)
//   PUT  /api/orders           עדכון סטטוס / הערה (מנהל חנות בלבד)
const ENDPOINT = STRAPI_URL + '/api/shop-orders';

module.exports = async (req, res) => {
	try {
		if (req.method === 'POST') {
			const b = parseBody(req);
			const items = Array.isArray(b.items) ? b.items.slice(0, 50).map(it => ({
				id: Number(it.id) || 0,
				name: String(it.name || '').slice(0, 120),
				price: Number(it.price) || 0,
				qty: Number(it.qty) || 1,
				emoji: String(it.emoji || '').slice(0, 8),
				seller_document_id: it.seller_document_id ? String(it.seller_document_id).slice(0, 60) : null,
			})) : [];
			const data = {
				customer_name: b.customer_name, customer_email: b.customer_email, customer_phone: b.customer_phone,
				customer_address: b.customer_address, customer_city: b.customer_city, customer_zip: b.customer_zip,
				note: b.note, payment_method: b.payment_method, items,
			};
			const r = await strapiFetch(ENDPOINT, { method: 'POST', headers: authHeaders(req), body: JSON.stringify({ data }) });
			if (!r.ok) return res.status(r.status >= 500 ? 502 : r.status).json({ error: r.json?.error?.message || 'ההזמנה נכשלה' });
			return res.status(200).json({ order: r.json?.data ?? null });
		}

		if (req.method === 'GET') {
			if (!req.query?.all) return res.status(400).json({ error: 'bad request' });
			if (!(await isShopAdmin(req))) return res.status(403).json({ error: 'forbidden' });
			const r = await strapiFetch(ENDPOINT + '?sort=createdAt:desc&pagination[pageSize]=200', { headers: authHeaders(req) });
			if (!r.ok) return res.status(r.status === 401 || r.status === 403 ? 403 : 502).json({ error: 'forbidden' });
			return res.status(200).json({ items: r.json?.data ?? [] });
		}

		if (req.method === 'PUT') {
			const b = parseBody(req);
			const documentId = String(b.documentId || '').trim();
			if (!documentId) return res.status(400).json({ error: 'missing id' });
			const data = {};
			if (['new', 'confirmed', 'shipped', 'completed', 'cancelled'].includes(b.status)) data.status = b.status;
			if (typeof b.admin_note === 'string') data.admin_note = b.admin_note.slice(0, 2000);
			const r = await strapiFetch(`${ENDPOINT}/${encodeURIComponent(documentId)}`, { method: 'PUT', headers: authHeaders(req), body: JSON.stringify({ data }) });
			if (!r.ok) return res.status(r.status === 401 || r.status === 403 ? 403 : 502).json({ error: r.json?.error?.message || 'failed' });
			return res.status(200).json({ order: r.json?.data ?? null });
		}

		return res.status(405).json({ error: 'method' });
	} catch {
		return res.status(500).json({ error: 'server' });
	}
};
