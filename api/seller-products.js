const { STRAPI_URL, readCookie, parseBody, authHeaders, isShopAdmin, strapiFetch: strapi } = require('./_shared');

// מוצרים שהקהל מגיש למכירה בחנות - פרוקסי ל-content type המשותף
// shop-seller-products ב-Strapi (community-backend/src/api/shop-seller-product).
//
//   GET  /api/seller-products            רשימת המוצרים המאושרים, בצורת מוצר-חנות (ציבורי, ממוטמן)
//   GET  /api/seller-products?all=1      כל ההגשות לפאנל הניהול (דורש עוגייה של מנהל חנות)
//   GET  /api/seller-products?mine=1     ההגשות של המשתמש המחובר
//   POST /api/seller-products            הגשת מוצר (אנונימי או מחובר) + תיעוד קבלת ההסכם
//   PUT  /api/seller-products            אישור / דחייה / הערה (מנהל חנות בלבד - Strapi אוכף)
//
// הזהות עוברת ב-JWT מהעוגייה המשותפת gofreeil-auth; Strapi מחליט מי מנהל.
const ENDPOINT = STRAPI_URL + '/api/shop-seller-products';

// מזהה מספרי יציב לצד הלקוח (העגלה שומרת id מספרי). מעל 100000 כדי לא
// להתנגש עם המוצרים הקבועים ב-data/products.js.
const ID_BASE = 100000;

function clientIp(req) {
	const xf = req.headers['x-forwarded-for'];
	if (typeof xf === 'string' && xf) return xf.split(',')[0].trim();
	return req.headers['x-real-ip'] || req.socket?.remoteAddress || '';
}

// טקסט שהמוכר הקליד נכנס ל-innerHTML בדפי החנות (כמו המוצרים הקבועים) - לכן
// מנטרלים HTML כאן, בגבול בין תוכן-משתמש לבין הדף.
function esc(v) {
	return String(v ?? '')
		.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
const DATA_IMAGE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
const SAFE_LINK = /^https?:\/\/[^\s"'<>]+$/;

// מזהה חנות לכתובת (store.html?s=...) - נגזר משם החנות; זהה ל-storeSlug ב-js/main.js
function storeSlug(name) {
	return String(name || '').trim().toLowerCase().replace(/["'`]/g, '').replace(/[\s/]+/g, '-');
}

// התמונות נשמרות ב-Strapi כ-data URL, אבל לרשימה הציבורית מחזירים כתובות
// (/img/<documentId>/<n>, מוגש ע"י api/product-image.js עם קאש CDN) - אחרת רשימת
// מוצרים עם גלריות הייתה שוקלת עשרות מגה, וקישורי שיתוף (og:image) חייבים URL.
function imageUrl(row, i) {
	return `/img/${encodeURIComponent(row.documentId)}/${i}`;
}
function galleryUrls(row) {
	const list = Array.isArray(row.images) && row.images.length ? row.images : (row.image ? [row.image] : []);
	return list.map((img, i) => (DATA_IMAGE.test(img || '') ? imageUrl(row, i) : '')).filter(Boolean);
}

// רשומת Strapi (approved) -> מוצר בפורמט של data/products.js, כולל פרטי החנות
// של המוכר (הקניון השיתופי: שם, לוגו, טלפון, וואטסאפ, עיר, אתר, תיאור - ציבוריים)
function toShopProduct(row) {
	const storeName = esc(row.store_name || row.seller_display || '');
	const images = galleryUrls(row);
	return {
		store: storeName,
		storeSlug: storeSlug(row.store_name || row.seller_display || ''),
		storeLogo: DATA_IMAGE.test(row.store_logo || '') ? imageUrl(row, 'logo') : '',
		storePhone: esc(row.store_phone || ''),
		storeWhatsapp: esc(row.store_whatsapp || row.store_phone || ''),
		storeCity: esc(row.store_city || ''),
		storeWebsite: SAFE_LINK.test(row.store_website || '') ? esc(row.store_website) : '',
		storeDescription: esc(row.store_description || ''),
		id: ID_BASE + Number(row.id),
		documentId: row.documentId,
		name: esc(row.name),
		category: esc(row.category || 'home'),
		price: Number(row.price),
		oldPrice: row.old_price ? Number(row.old_price) : null,
		rating: 5,
		reviews: 0,
		emoji: esc(row.emoji || '📦'),
		image: images[0] || '',
		images,
		desc: esc(row.description || ''),
		link: SAFE_LINK.test(row.link || '') ? esc(row.link) : '',
		quantity: row.quantity,
		deliveryDays: row.delivery_days,
		seller: storeName || esc(row.seller_display || ''),
		badge: 'new',
		featured: false,
		approvedAt: row.decided_at || row.createdAt,
	};
}

module.exports = async (req, res) => {
	try {
		if (req.method === 'GET') {
			const q = req.query || {};
			if (q.mine) {
				const r = await strapi(ENDPOINT + '/mine', { headers: authHeaders(req) });
				return res.status(r.ok ? 200 : r.status).json(r.ok ? { items: r.json?.data ?? [] } : { error: 'forbidden' });
			}
			if (q.all) {
				// מנהל חנות בלבד: מאמתים את התפקיד מול Strapi לפני שמחזירים משהו, כדי
				// שהפאנל יקבל 403 ברור (ויציג מסך כניסה) גם כשאין עדיין הגשות.
				if (!(await isShopAdmin(req))) return res.status(403).json({ error: 'forbidden' });
				const url = ENDPOINT + '?sort=createdAt:desc&pagination[pageSize]=200';
				const r = await strapi(url, { headers: authHeaders(req) });
				if (!r.ok) return res.status(r.status === 401 || r.status === 403 ? 403 : 502).json({ error: 'forbidden' });
				return res.status(200).json({ items: r.json?.data ?? [] });
			}
			const url = ENDPOINT + '?filters[status][$eq]=approved&sort=decided_at:desc&pagination[pageSize]=200';
			const r = await strapi(url, { headers: { 'Content-Type': 'application/json' } });
			if (!r.ok) return res.status(502).json({ items: [] });
			res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
			return res.status(200).json({ items: (r.json?.data ?? []).map(toShopProduct) });
		}

		if (req.method === 'POST') {
			const body = parseBody(req);
			const data = { ...body, contract_ip: clientIp(req) };
			const r = await strapi(ENDPOINT, {
				method: 'POST',
				headers: authHeaders(req),
				body: JSON.stringify({ data })
			});
			if (!r.ok) {
				const msg = r.json?.error?.message || 'ההגשה נכשלה';
				return res.status(r.status >= 500 ? 502 : r.status).json({ error: msg });
			}
			return res.status(200).json({ item: r.json?.data ?? null });
		}

		if (req.method === 'PUT') {
			const body = parseBody(req);
			const documentId = String(body.documentId || '').trim();
			if (!documentId) return res.status(400).json({ error: 'missing id' });
			const data = {};
			if (['pending', 'approved', 'rejected'].includes(body.status)) data.status = body.status;
			if (typeof body.rejection_reason === 'string') data.rejection_reason = body.rejection_reason.slice(0, 1000);
			if (typeof body.admin_note === 'string') data.admin_note = body.admin_note.slice(0, 1000);
			const r = await strapi(`${ENDPOINT}/${encodeURIComponent(documentId)}`, {
				method: 'PUT',
				headers: authHeaders(req),
				body: JSON.stringify({ data })
			});
			if (!r.ok) return res.status(r.status === 401 || r.status === 403 ? 403 : 502).json({ error: r.json?.error?.message || 'failed' });
			return res.status(200).json({ item: r.json?.data ?? null });
		}

		if (req.method === 'DELETE') {
			const body = parseBody(req);
			const documentId = String(body.documentId || req.query?.id || '').trim();
			if (!documentId) return res.status(400).json({ error: 'missing id' });
			const r = await strapi(`${ENDPOINT}/${encodeURIComponent(documentId)}`, { method: 'DELETE', headers: authHeaders(req) });
			if (!r.ok) return res.status(r.status === 401 || r.status === 403 ? 403 : 502).json({ error: 'failed' });
			return res.status(200).json({ ok: true });
		}

		return res.status(405).json({ error: 'method' });
	} catch {
		return res.status(500).json({ error: 'server' });
	}
};
