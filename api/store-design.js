const { STRAPI_URL, strapiFetch: strapi } = require('./_shared');

// עיצוב דף החנות שהמוכר בנה בסטודיו (store-designer.html) - קריאה ציבורית.
//
//   GET /api/store-design?s=<slug>   { design: "<JSON>" | null }
//
// פרוקסי לנקודת הקצה הציבורית של Strapi (shop-stores/design), שמחזירה את
// השדה store_design ורק לחנות מאושרת. כך כל מי שנכנס לדף החנות רואה את מה
// שהמוכר עיצב - לא רק המוכר בדפדפן שלו. התשובה ממוטמנת ב-CDN לדקה, כי
// העיצוב משתנה לעתים רחוקות ודף החנות נטען הרבה.
const ENDPOINT = STRAPI_URL + '/api/shop-stores/design';

module.exports = async (req, res) => {
	try {
		if (req.method !== 'GET') return res.status(405).json({ error: 'method' });
		const slug = String(req.query?.s || '').trim().slice(0, 200);
		if (!slug) return res.status(400).json({ error: 'missing slug' });
		const r = await strapi(`${ENDPOINT}?s=${encodeURIComponent(slug)}`, { headers: { 'Content-Type': 'application/json' } });
		if (!r.ok) return res.status(200).json({ design: null });
		res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
		return res.status(200).json({ design: r.json?.data?.design || null });
	} catch {
		// כישלון בטעינת העיצוב אינו שובר את דף החנות - הוא נופל לתצוגה הרגילה
		return res.status(200).json({ design: null });
	}
};
