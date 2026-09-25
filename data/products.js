const categories = [
  { id: 'health', name: 'בריאות טבעית', icon: 'fa-leaf', color: '#10b981', desc: 'ויטמינים, צמחי מרפא, תוספי תזונה', image: 'images/health.jpg' },
  { id: 'agriculture', name: 'חקלאות ביתית', icon: 'fa-seedling', color: '#84cc16', desc: 'גינון אורבני, זרעים, ציוד', image: 'images/agriculture.jpg' },
  { id: 'tech', name: 'טכנולוגיה מתקדמת', icon: 'fa-microchip', color: '#6366f1', desc: 'גאדג׳טים חכמים, אלקטרוניקה', image: 'images/tech.jpg' },
  { id: 'beauty', name: 'יופי וטיפוח', icon: 'fa-spa', color: '#a855f7', desc: 'קוסמטיקה טבעית, טיפוח', image: 'images/beauty.jpg' },
  { id: 'courses', name: 'ידע וקורסים', icon: 'fa-graduation-cap', color: '#f59e0b', desc: 'קורסים, סדנאות, ספרים ומדריכים' }
];

// רק מוצרים אמיתיים: מוצרי מוכרים מאושרים נטענים מ-/api/seller-products (js/main.js).
const products = [];
