const { STRAPI_URL, readCookie, authHeaders, parseBody, strapiFetch: strapi } = require('./_shared');

// אמנת המוסר העולמית (UECC) - תנאי סף לפתיחת חנות בקניון.
// החתימות מנוהלות בחכמי העדה (content type ch-charter-signature ב-Strapi
// המשותף), וההתאמה למשתמש נעשית שם לפי האימייל של החשבון המחובר.
//
//   GET  /api/charter   { signed, guest, signUrl, signature: { name, signedDate } | null }
//   POST /api/charter   חתימה מכאן, בלי לצאת לאתר חכמי העדה: { name, city?, phone?, businessName? }
//                       נרשמת באותו מאגר חתימות, עם האימייל של החשבון - כך השם מופיע
//                       ברשומות החותמים שם, והחנות (וה-create של מוצר) מזהים אותה מיד.
//
// זהו מידע לתצוגה בלבד - האכיפה עצמה היא בשרת, ב-create של shop-seller-product,
// שדוחה הגשה של מי שאינו חתום (ולכן היא גם לא מגיעה להנהלה לאישור).
const COLLECTION = STRAPI_URL + '/api/ch-charter-signatures';
const ENDPOINT = COLLECTION + '/mine';
const SIGN_URL = 'https://chachmim.gofreeil.com/heichal-hamaaseh/ethical-code';
const INDEX_URL = 'https://chachmim.gofreeil.com/charter-index';

const S = (v, max = 200) => String(v ?? '').trim().slice(0, max);

async function sign(req, res, jwt) {
	if (!jwt) return res.status(401).json({ error: 'נדרשת התחברות כדי לחתום על האמנה' });
	const body = parseBody(req);
	const name = S(body.name, 120);
	if (!name) return res.status(400).json({ error: 'יש למלא שם מלא לחתימה' });
	if (body.accepted !== true) return res.status(400).json({ error: 'יש לאשר את נוסח האמנה' });

	// האימייל נלקח מהחשבון בשרת (לא מהדפדפן) - זה מה שמקשר את החתימה למשתמש
	const me = await strapi(STRAPI_URL + '/api/users/me', { headers: authHeaders(req) });
	const email = S(me.json?.email, 160).toLowerCase();
	if (!me.ok || !email) return res.status(401).json({ error: 'ההתחברות פגה. התחברו מחדש ונסו שוב.' });

	// כבר חתום באותו אימייל - לא יוצרים כפילות ברשומות
	const mine = await strapi(ENDPOINT, { headers: authHeaders(req) });
	const prev = mine.json?.data;
	if (prev && prev.status === 'signed') {
		return res.status(200).json({ signed: true, signUrl: SIGN_URL, indexUrl: INDEX_URL, signature: { name: prev.name || '', signedDate: prev.signedDate || null } });
	}
	if (prev && prev.status === 'disqualified') return res.status(403).json({ error: 'החתימה שלך על האמנה נפסלה בחכמי העדה. לבירור - פנו לחכמי העדה.' });

	// יצירה כמו בטופס שבאתר חכמי העדה (הרשאת create ציבורית, בלי טוקן המשתמש)
	const data = {
		name,
		businessName: S(body.businessName, 200) || undefined,
		city: S(body.city, 200) || undefined,
		phone: S(body.phone, 40) || undefined,
		email,
		status: 'signed',
		signedDate: new Date().toISOString().slice(0, 10),
		acceptedTerms: true,
	};
	const r = await strapi(COLLECTION, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) });
	if (!r.ok) return res.status(502).json({ error: 'החתימה לא נשמרה - תקלה זמנית. נסו שוב בעוד רגע.' });
	return res.status(200).json({ signed: true, created: true, signUrl: SIGN_URL, indexUrl: INDEX_URL, signature: { name, signedDate: data.signedDate } });
}

module.exports = async (req, res) => {
	try {
		res.setHeader('Cache-Control', 'no-store');
		const jwt = readCookie(req.headers.cookie, 'gofreeil-auth');
		if (req.method === 'POST') return await sign(req, res, jwt);
		if (req.method !== 'GET') return res.status(405).json({ error: 'method' });
		if (!jwt) return res.status(200).json({ signed: false, guest: true, signUrl: SIGN_URL, indexUrl: INDEX_URL, signature: null });
		const r = await strapi(ENDPOINT, { headers: authHeaders(req) });
		// כשל טכני בבדיקה - מסמנים error כדי שהדף לא יאשים מוכר חתום שלא חתם
		if (!r.ok) return res.status(200).json({ signed: false, error: true, signUrl: SIGN_URL, indexUrl: INDEX_URL, signature: null });
		const sig = r.json?.data || null;
		// מי שנפסל (status=disqualified) נחשב כמי שאינו חתום - אותו כלל כמו בשרת
		const signed = !!sig && sig.status === 'signed';
		return res.status(200).json({
			signed,
			signUrl: SIGN_URL,
			indexUrl: INDEX_URL,
			signature: signed ? { name: sig.name || '', signedDate: sig.signedDate || null } : null
		});
	} catch {
		if (req.method === 'POST') return res.status(500).json({ error: 'החתימה לא נשמרה - תקלה זמנית. נסו שוב בעוד רגע.' });
		return res.status(200).json({ signed: false, error: true, signUrl: SIGN_URL, indexUrl: INDEX_URL, signature: null });
	}
};
