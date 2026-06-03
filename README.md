# נו-שופ 🛍️

חנות מקוונת חכמה - בריאות טבעית, חקלאות ביתית, טכנולוגיה ועוד.

## פיצ'רים
- 8 דפים מלאים (בית, חנות, קטגוריות, עגלה, תשלום, אודות, צור קשר, אדמין)
- ממשק אדמין מלא: דשבורד, ניהול מוצרים (CRUD), הזמנות, לקוחות
- חיפוש חי, סינון, מיון, מועדפים, Quick View
- מצב כהה, RTL מלא, רספונסיבי
- localStorage לעגלה, מועדפים, מוצרים מותאמים

## הפעלה מקומית
```bash
npm run dev
```
פתח: http://localhost:5193

## אדמין
URL: `/admin.html`
משתמש: `admin` | סיסמה: `admin`

## פריסה ל-Vercel
```bash
npx vercel
```
או ב-GUI: https://vercel.com/new - חבר את הריפו.

## פריסה ל-GitHub
```bash
git init
git add .
git commit -m "Initial commit"
gh repo create no-shop --public --source=. --push
```
