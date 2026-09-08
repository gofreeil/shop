const { STRAPI_URL, parseBody, authHeaders, strapiFetch: strapi } = require('./_shared');

// דריסות תוכן של האתר - טקסטים ותמונות שסופר-אדמין ערך מתוך הדפים עצמם
// (js/site-editor.js). פרוקסי ל-shop-site-overrides ב-Strapi המשותף
// (community-backend/src/api/shop-site-override).
//
//   GET    /api/site-content?page=<page>   הדריסות של דף (ציבורי, ממוטמן ב-CDN)
//   POST   /api/site-content               upsert { key, page, kind, data } (סופר-אדמין - Strapi אוכף)
//   DELETE /api/site-content?key=<key>     מחיקת דריסה = חזרה לתוכן המקורי (סופר-אדמין)
//
// תמונות נשמרות ב-Strapi כ-data URL; לרשימה הציבורית מחזירים כתובת
// (/site-img/<documentId>?v=<updatedAt>, מוגש ע"י api/site-image.js עם קאש CDN).
const ENDPOINT = STRAPI_URL + '/api/shop-site-overrides';
const DATA_IMAGE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/;

function publicRow(row) {
	const data = row.data && typeof row.data === 'object' ? { ...row.data } : {};
	if (row.kind === 'image') {
		data.src = DATA_IMAGE.test(data.src || '')
			? `/site-img/${encodeURIComponent(row.documentId)}?v=${Date.parse(row.updatedAt) || 0}`
			: '';
	}
	return { key: row.key, page: row.page, kind: row.kind, data, updatedAt: row.updatedAt };
}

async function findByKey(key, headers) {
	const r = await strapi(`${ENDPOINT}?filters[key][$eq]=${encodeURIComponent(key)}&pagination[pageSize]=1`, { headers });
	return r.ok ? (r.json?.data ?? [])[0] || null : null;
}

module.exports = async (req, res) => {
	try {
		if (req.method === 'GET') {
			const page = String(req.query?.page || '').trim().slice(0, 40);
			if (!/^[a-z0-9_-]{1,40}$/.test(page)) return res.status(400).json({ error: 'page' });
			// דריסות הדף + דריסות גלובליות (page='*': מוצרים, קטגוריות, באנר) שחלות בכל הדפים
			const url = `${ENDPOINT}?filters[page][$in][0]=${encodeURIComponent(page)}&filters[page][$in][1]=*&pagination[pageSize]=500`;
			const r = await strapi(url, { headers: { 'Content-Type': 'application/json' } });
			if (!r.ok) return res.status(502).json({ items: [] });
			// העורך מבקש ?fresh=1 (בלי קאש) כדי לראות מיד את מה ששמר
			if (!req.query?.fresh) res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
			else res.setHeader('Cache-Control', 'no-store');
			return res.status(200).json({ items: (r.json?.data ?? []).map(publicRow) });
		}

		if (req.method === 'POST') {
			const b = parseBody(req);
			const key = String(b.key || '').trim().slice(0, 255);
			if (!key) return res.status(400).json({ error: 'missing key' });
			const body = { key, page: String(b.page || '').slice(0, 40), kind: b.kind === 'image' ? 'image' : 'text', data: b.data && typeof b.data === 'object' ? b.data : {} };
			const r = await strapi(ENDPOINT + '/upsert', { method: 'POST', headers: authHeaders(req), body: JSON.stringify(body) });
			if (!r.ok) return res.status(r.status === 401 || r.status === 403 ? 403 : r.status >= 500 ? 502 : r.status).json({ error: r.json?.error?.message || 'השמירה נכשלה' });
			return res.status(200).json({ item: r.json?.data ? publicRow(r.json.data) : null });
		}

		if (req.method === 'DELETE') {
			const key = String(req.query?.key || parseBody(req).key || '').trim().slice(0, 255);
			if (!key) return res.status(400).json({ error: 'missing key' });
			const row = await findByKey(key, authHeaders(req));
			if (!row) return res.status(200).json({ ok: true });
			const r = await strapi(`${ENDPOINT}/${encodeURIComponent(row.documentId)}`, { method: 'DELETE', headers: authHeaders(req) });
			if (!r.ok) return res.status(r.status === 401 || r.status === 403 ? 403 : 502).json({ error: r.json?.error?.message || 'המחיקה נכשלה' });
			return res.status(200).json({ ok: true });
		}

		return res.status(405).json({ error: 'method' });
	} catch {
		return res.status(500).json({ error: 'server' });
	}
};
