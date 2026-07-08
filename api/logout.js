const { clearSharedCookie } = require('./_shared');

// התנתקות — מוחק את העוגייה המשותפת (מתנתק מכל אתרי יוצאים לחירות).
module.exports = async (req, res) => {
	clearSharedCookie(res);
	return res.status(200).json({ ok: true });
};
