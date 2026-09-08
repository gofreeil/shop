const { STRAPI_URL, strapiFetch: strapi } = require('./_shared');

// תמונות שסופר-אדמין החליף מתוך האתר - /site-img/<documentId>?v=<updatedAt>.
// הרשומה ב-shop-site-overrides מחזיקה data URL; כאן מפענחים ומגישים כתמונה
// רגילה עם קאש CDN ארוך (הכתובת כוללת גרסה, ולכן שינוי = כתובת חדשה).
const DATA_IMAGE = /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=]+)$/;

module.exports = async (req, res) => {
	const d = String(req.query?.d || '').trim();
	if (!/^[A-Za-z0-9_-]{1,64}$/.test(d)) return res.status(400).end();
	try {
		const r = await strapi(`${STRAPI_URL}/api/shop-site-overrides/${encodeURIComponent(d)}`, { headers: { 'Content-Type': 'application/json' } });
		const row = r.ok ? r.json?.data : null;
		const m = row?.kind === 'image' ? DATA_IMAGE.exec(row.data?.src || '') : null;
		if (!m) return res.status(404).end();
		const buf = Buffer.from(m[2], 'base64');
		res.setHeader('Content-Type', m[1] === 'image/jpg' ? 'image/jpeg' : m[1]);
		res.setHeader('Content-Length', buf.length);
		res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
		return res.status(200).end(buf);
	} catch {
		return res.status(502).end();
	}
};
