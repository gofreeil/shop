const { STRAPI_URL, readCookie, authHeaders, strapiFetch: strapi } = require('./_shared');

// אמנת המוסר העולמית (UECC) - תנאי סף לפתיחת חנות בקניון.
// החתימות מנוהלות בחכמי העדה (content type ch-charter-signature ב-Strapi
// המשותף), וההתאמה למשתמש נעשית שם לפי האימייל של החשבון המחובר.
//
//   GET /api/charter   { signed, guest, signUrl, signature: { name, signedDate } | null }
//
// זהו מידע לתצוגה בלבד - האכיפה עצמה היא בשרת, ב-create של shop-seller-product,
// שדוחה הגשה של מי שאינו חתום (ולכן היא גם לא מגיעה להנהלה לאישור).
const ENDPOINT = STRAPI_URL + '/api/ch-charter-signatures/mine';
const SIGN_URL = 'https://chachmim.gofreeil.com/heichal-hamaaseh/ethical-code';

module.exports = async (req, res) => {
	if (req.method !== 'GET') return res.status(405).json({ error: 'method' });
	try {
		res.setHeader('Cache-Control', 'no-store');
		const jwt = readCookie(req.headers.cookie, 'gofreeil-auth');
		if (!jwt) return res.status(200).json({ signed: false, guest: true, signUrl: SIGN_URL, signature: null });
		const r = await strapi(ENDPOINT, { headers: authHeaders(req) });
		if (!r.ok) return res.status(200).json({ signed: false, signUrl: SIGN_URL, signature: null });
		const sig = r.json?.data || null;
		// מי שנפסל (status=disqualified) נחשב כמי שאינו חתום - אותו כלל כמו בשרת
		const signed = !!sig && sig.status === 'signed';
		return res.status(200).json({
			signed,
			signUrl: SIGN_URL,
			signature: signed ? { name: sig.name || '', signedDate: sig.signedDate || null } : null
		});
	} catch {
		return res.status(200).json({ signed: false, signUrl: SIGN_URL, signature: null });
	}
};
