const { STRAPI_URL, readCookie, setSharedCookie, isSuperAdminUser, friendlyName, avatarUrl } = require('./_shared');

// תוקף ה-JWT (שדה exp) בשניות, בלי אימות חתימה - רק כדי לדעת מתי לבקש טוקן חדש
function jwtExp(jwt) {
	try {
		const payload = JSON.parse(Buffer.from(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
		return Number(payload.exp) || null;
	} catch {
		return null;
	}
}
// חלון של יומיים - הקהילה מרעננת את הטוקן שבסשן שלה 3 ימים לפני פג-התוקף, אז הגשר
// יחזיר כאן טוקן חדש באמת (בחלון רחב יותר הוא היה מחזיר את אותו טוקן שוב ושוב)
const RENEW_BEFORE_S = 2 * 24 * 60 * 60;

// מחזיר את המשתמש המחובר לפי העוגייה המשותפת gofreeil-auth (או null).
// המשתמש לא אמור להתנתק לעולם מאותו מכשיר, ולכן:
//   - כל ביקור מחובר מחדש את העוגייה לשנה מלאה (הקהילה שותלת אותה ל-90 יום בלבד)
//   - renew=true כשה-JWT עומד לפוג - הדפדפן מושך טוקן חדש דרך גשר ה-SSO של הקהילה
//   - expired=true רק כש-Strapi דחה את הטוקן; תקלת רשת/שרת מחזירה transient=true,
//     והדפדפן נשאר מחובר במקום "לנתק" את המשתמש בגלל שיהוק של השרת
module.exports = async (req, res) => {
	res.setHeader('Cache-Control', 'no-store');
	const jwt = readCookie(req.headers.cookie, 'gofreeil-auth');
	if (!jwt) return res.status(200).json({ user: null });
	try {
		const r = await fetch(STRAPI_URL + '/api/users/me', { headers: { Authorization: `Bearer ${jwt}` }, signal: AbortSignal.timeout(10_000) });
		if (r.status === 401 || r.status === 403) return res.status(200).json({ user: null, expired: true });
		if (!r.ok) return res.status(200).json({ user: null, transient: true });
		const u = await r.json();
		setSharedCookie(res, jwt);
		const exp = jwtExp(jwt);
		const renew = !!exp && exp - Date.now() / 1000 < RENEW_BEFORE_S;
		// superAdmin מדליק את עורך התוכן באתר (js/site-editor.js); הכתיבה עצמה נאכפת ב-Strapi
		return res.status(200).json({ user: { name: friendlyName(u), email: u.email, avatar: avatarUrl(u), superAdmin: isSuperAdminUser(u) }, renew });
	} catch {
		return res.status(200).json({ user: null, transient: true });
	}
};
