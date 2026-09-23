const { STRAPI_URL, readCookie, parseBody, authHeaders, isShopAdmin, strapiFetch: strapi } = require('./_shared');

// החנות של המוכר המחובר בקניון השיתופי - פרוקסי ל-content type shop-stores
// ב-Strapi (community-backend/src/api/shop-store). רשומה אחת למשתמש, נשמרת בשלב
// "פתיחת חנות" (sell.html) לפני העלאת מוצרים (add-product.html).
//
//   GET  /api/store          החנות של המשתמש המחובר: { store } (null אם אין; guest=true בלי התחברות)
//   GET  /api/store?public=1 החנויות המאושרות (פרטים ציבוריים) - ציבורי; כך חנות מאושרת מופיעה בקניון גם בלי מוצרים
//   GET  /api/store?all=1   כל החנויות שנפתחו, ללוח הבקרה של המנהל (מנהל חנות בלבד)
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

// שגיאת Strapi -> הודעה שאפשר להציג למוכר. ההודעות משם אנגליות ולרוב חסרות
// משמעות בשבילו ("Not Found" כשמאגר החנויות אינו קיים בשרת), ולכן מעבירים הלאה
// רק הודעה שכבר כתובה בעברית, ומתרגמים את השאר לפי הסטטוס.
function storeError(status, msg) {
	if (msg && /[\u0590-\u05FF]/.test(msg)) return msg;
	if (status === 401 || status === 403) return 'ההתחברות פגה. התחברו מחדש ונסו לשמור שוב.';
	if (status === 404) return 'שירות החנויות אינו זמין כרגע בשרת.';
	return 'שמירת החנות נכשלה בשרת. נסו שוב בעוד כמה דקות.';
}

// טקסט שהמוכר הקליד נכנס ל-innerHTML בדפי החנות - מנטרלים HTML כאן (כמו ב-seller-products.js)
function esc(v) {
	return String(v ?? '')
		.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
const SAFE_LINK = /^https?:\/\/[^\s"'<>]+$/;
// מזהה חנות לכתובת (store.html?s=...) - זהה ל-storeSlug ב-js/main.js
function storeSlug(name) {
	return String(name || '').trim().toLowerCase().replace(/["'`]/g, '').replace(/[\s/]+/g, '-');
}
// רשומת חנות מאושרת -> חנות בפורמט של storesFromProducts (js/main.js)
function toPublicStore(row) {
	return {
		slug: storeSlug(row.store_name),
		name: esc(row.store_name),
		logo: row.has_logo ? `/store-logo/${encodeURIComponent(row.documentId)}` : '',
		phone: esc(row.store_phone),
		whatsapp: esc(row.store_whatsapp || row.store_phone),
		city: esc(row.store_city),
		website: SAFE_LINK.test(row.store_website || '') ? esc(row.store_website) : '',
		description: esc(row.store_description),
		approvedAt: row.decided_at || ''
	};
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
			if (req.query?.public) {
				const r = await strapi(ENDPOINT + '/public', { headers: { 'Content-Type': 'application/json' } });
				if (!r.ok) return res.status(502).json({ stores: [] });
				res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
				return res.status(200).json({ stores: (r.json?.data ?? []).map(toPublicStore) });
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
				return res.status(r.status >= 500 ? 502 : r.status).json({ error: storeError(r.status, r.json?.error?.message) });
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
			if (!r.ok) return res.status(r.status === 401 || r.status === 403 ? 403 : 502).json({ error: storeError(r.status, r.json?.error?.message) });
			return res.status(200).json({ store: r.json?.data ?? null });
		}

		return res.status(405).json({ error: 'method' });
	} catch {
		return res.status(500).json({ error: 'server' });
	}
};
