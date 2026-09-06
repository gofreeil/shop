const { STRAPI_URL, strapiFetch: strapi } = require('./_shared');

// תמונות של מוצרי מוכרים - /img/<documentId>/<n> (n = אינדקס בגלריה, או "logo"
// ללוגו החנות). הרשומות ב-Strapi מחזיקות data URL; כאן מפענחים ומגישים כתמונה
// רגילה עם קאש CDN, כך שרשימת המוצרים נשארת קלה ו-og:image של קישורי השיתוף
// מקבל כתובת אמיתית. Strapi מחזיר לציבור רק מוצרים מאושרים - לכן אין כאן
// דליפה של הגשות ממתינות.
const DATA_IMAGE = /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=]+)$/;

module.exports = async (req, res) => {
	const d = String(req.query?.d || '').trim();
	const i = String(req.query?.i || '0').trim();
	if (!/^[A-Za-z0-9_-]{1,64}$/.test(d) || !/^(logo|\d{1,2})$/.test(i)) return res.status(400).end();
	try {
		const r = await strapi(`${STRAPI_URL}/api/shop-seller-products/${encodeURIComponent(d)}`, { headers: { 'Content-Type': 'application/json' } });
		const row = r.ok ? r.json?.data : null;
		if (!row) return res.status(404).end();
		let src = '';
		if (i === 'logo') src = row.store_logo || '';
		else {
			const list = Array.isArray(row.images) && row.images.length ? row.images : (row.image ? [row.image] : []);
			src = list[Number(i)] || '';
		}
		const m = DATA_IMAGE.exec(src);
		if (!m) return res.status(404).end();
		const buf = Buffer.from(m[2], 'base64');
		res.setHeader('Content-Type', m[1] === 'image/jpg' ? 'image/jpeg' : m[1]);
		res.setHeader('Content-Length', buf.length);
		// מוצר מאושר לא משתנה (הגשה חדשה = רשומה חדשה) - קאש ארוך ב-CDN
		res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
		return res.status(200).end(buf);
	} catch {
		return res.status(502).end();
	}
};
