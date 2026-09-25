const { STRAPI_URL, readCookie, parseBody, authHeaders, isShopAdmin, strapiFetch: strapi } = require('./_shared');

// מוצרים שהקהל מגיש למכירה בחנות - פרוקסי ל-content type המשותף
// shop-seller-products ב-Strapi (community-backend/src/api/shop-seller-product).
//
//   GET  /api/seller-products            רשימת המוצרים המאושרים, בצורת מוצר-חנות (ציבורי, ממוטמן)
//   GET  /api/seller-products?all=1      כל ההגשות לפאנל הניהול (דורש עוגייה של מנהל חנות)
//   GET  /api/seller-products?count=1    כמה הגשות ממתינות לאישור (מנהל חנות) - לתג ההתראה בכותרת
//   GET  /api/seller-products?mine=1     ההגשות של המשתמש המחובר
//   POST /api/seller-products            הגשת מוצר (אנונימי או מחובר) + תיעוד קבלת ההסכם
//   PUT  /api/seller-products            אישור / דחייה / הערה (מנהל חנות בלבד - Strapi אוכף)
//   DELETE /api/seller-products?mine=1   מחיקת מוצר של המשתמש בלבד (Strapi אוכף בעלות)
//   PUT  /api/seller-products?mine=1     ניהול מלאי עצמי - כמות/מחיר/אספקה/תיאור/קישור/תצוגה (visibility) על מוצר של המשתמש בלבד
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
// ?v= לפי updatedAt: תמונה שנערכה (זום של מנהל) מקבלת כתובת חדשה ועוקפת את קאש ה-CDN
function imageUrl(row, i) {
	const v = Date.parse(row.updatedAt || "");
	return `/img/${encodeURIComponent(row.documentId)}/${i}${v ? `?v=${v.toString(36)}` : ""}`;
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
		category: esc(row.category || 'health'),
		price: Number(row.price),
		oldPrice: row.old_price ? Number(row.old_price) : null,
		shippingPrice: row.shipping_price == null ? null : Number(row.shipping_price),
		rating: 5,
		reviews: 0,
		emoji: esc(row.emoji || '📦'),
		image: images[0] || '',
		images,
		shortDesc: esc(row.short_description || ''),
		desc: esc(row.description || ''),
		link: SAFE_LINK.test(row.link || '') ? esc(row.link) : '',
		quantity: row.quantity,
		deliveryDays: row.delivery_days,
		deliveryByCarrier: !!row.delivery_by_carrier,
		seller: storeName || esc(row.seller_display || ''),
		visibility: esc(row.visibility || 'visible'),
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
			if (q.count) {
				// רק המספר: כמה הגשות ממתינות לאישור - לתג ההתראה בכותרת האתר.
				// בלי גוף הרשומות (התמונות כבדות), רק meta.pagination.total.
				if (!(await isShopAdmin(req))) return res.status(403).json({ error: 'forbidden' });
				const url = ENDPOINT + '?filters[status][$eq]=pending&fields[0]=id&pagination[pageSize]=1';
				const r = await strapi(url, { headers: authHeaders(req) });
				if (!r.ok) return res.status(r.status === 401 || r.status === 403 ? 403 : 502).json({ error: 'forbidden' });
				return res.status(200).json({ pending: r.json?.meta?.pagination?.total ?? 0 });
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
			// מנהל מבקש ?fresh=1 (בלי קאש) כדי לראות מיד מחיקה/הסתרה שעשה
			res.setHeader('Cache-Control', q.fresh ? 'no-store' : 's-maxage=30, stale-while-revalidate=60');
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

			// ניהול מלאי עצמי (לוח המכוונים של המוכר): רק שדות המלאי/מחיר, ורק על המוצר שלו - Strapi אוכף בעלות
			if (req.query?.mine) {
				const data = {};
				for (const k of ['name', 'category', 'quantity', 'price', 'old_price', 'shipping_price', 'delivery_days', 'delivery_by_carrier', 'short_description', 'description', 'link', 'visibility', 'neighborhoods', 'images']) {
					if (body[k] !== undefined) data[k] = body[k];
				}
				const r = await strapi(`${ENDPOINT}/mine/${encodeURIComponent(documentId)}`, {
					method: 'PUT',
					headers: authHeaders(req),
					body: JSON.stringify({ data })
				});
				if (!r.ok) return res.status(r.status === 401 || r.status === 403 ? 403 : r.status === 400 ? 400 : 502).json({ error: r.json?.error?.message || 'failed' });
				return res.status(200).json({ item: r.json?.data ?? null });
			}

			const data = {};
			if (['pending', 'approved', 'rejected'].includes(body.status)) data.status = body.status;
			if (typeof body.rejection_reason === 'string') data.rejection_reason = body.rejection_reason.slice(0, 1000);
			if (typeof body.admin_note === 'string') data.admin_note = body.admin_note.slice(0, 1000);
			// עריכת המוצר עצמו מגלגל השיניים שבחלון המוצר (סופר-אדמין) - Strapi אוכף שהמבקש מנהל
			const TEXT = { name: 120, category: 40, emoji: 8, short_description: 80, description: 2000, link: 300 };
			for (const [k, max] of Object.entries(TEXT)) {
				if (typeof body[k] === 'string') data[k] = body[k].trim().slice(0, max);
			}
			if (data.link && !SAFE_LINK.test(data.link)) return res.status(400).json({ error: 'הקישור צריך להתחיל ב-http(s)://' });
			if (data.name === '') return res.status(400).json({ error: 'שם המוצר חובה' });
			const num = v => (v === '' || v == null ? null : Number(v));
			if (body.price !== undefined) {
				const price = num(body.price);
				if (!price || !Number.isFinite(price) || price <= 0) return res.status(400).json({ error: 'מחיר לא תקין' });
				data.price = Math.round(price * 100) / 100;
			}
			if (body.old_price !== undefined) data.old_price = num(body.old_price) > 0 ? Math.round(num(body.old_price) * 100) / 100 : null;
			if (body.shipping_price !== undefined) data.shipping_price = num(body.shipping_price) >= 0 && num(body.shipping_price) !== null ? Math.round(num(body.shipping_price) * 100) / 100 : null;
			if (body.quantity !== undefined) data.quantity = num(body.quantity) == null || !Number.isFinite(num(body.quantity)) ? null : Math.max(0, Math.floor(num(body.quantity))); // 0 = אזל, ריק = ללא הגבלה
			if (body.delivery_days !== undefined) data.delivery_days = num(body.delivery_days) > 0 ? Math.floor(num(body.delivery_days)) : null;
			if (body.delivery_by_carrier !== undefined) data.delivery_by_carrier = body.delivery_by_carrier === true || body.delivery_by_carrier === 'true';
			if (['visible', 'hidden', 'neighborhoods'].includes(body.visibility)) data.visibility = body.visibility;
			// החלפת תמונה אחת בגלריה (זום/מרכוז של מנהל): שולפים את הגלריה המלאה ומחליפים רק אותה
			if (body.replace_image) {
				const idx = Number(body.replace_image.index);
				const img = String(body.replace_image.data || '');
				if (!DATA_IMAGE.test(img) || img.length > 1200000) return res.status(400).json({ error: 'תמונה לא תקינה' });
				const cur = await strapi(`${ENDPOINT}/${encodeURIComponent(documentId)}`, { headers: authHeaders(req) });
				const row = cur.ok ? cur.json?.data : null;
				if (!row) return res.status(404).json({ error: 'המוצר לא נמצא' });
				const list = Array.isArray(row.images) && row.images.length ? [...row.images] : (row.image ? [row.image] : []);
				if (!Number.isInteger(idx) || idx < 0 || idx >= list.length) return res.status(400).json({ error: 'תמונה לא קיימת' });
				list[idx] = img;
				data.images = list;
				data.image = list[0];
			}
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
			const path = req.query?.mine ? '/mine/' : '/';
			const r = await strapi(`${ENDPOINT}${path}${encodeURIComponent(documentId)}`, { method: 'DELETE', headers: authHeaders(req) });
			if (!r.ok) return res.status(r.status === 401 || r.status === 403 ? 403 : 502).json({ error: 'failed' });
			return res.status(200).json({ ok: true });
		}

		return res.status(405).json({ error: 'method' });
	} catch {
		return res.status(500).json({ error: 'server' });
	}
};
