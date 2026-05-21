const categories = [
  { id: 'health', name: 'בריאות טבעית', icon: 'fa-leaf', color: '#10b981', desc: 'ויטמינים, צמחי מרפא, תוספי תזונה' },
  { id: 'agriculture', name: 'חקלאות ביתית', icon: 'fa-seedling', color: '#84cc16', desc: 'גינון אורבני, זרעים, ציוד' },
  { id: 'tech', name: 'טכנולוגיה מתקדמת', icon: 'fa-microchip', color: '#6366f1', desc: 'גאדג׳טים חכמים, אלקטרוניקה' },
  { id: 'home', name: 'בית וגן', icon: 'fa-home', color: '#f59e0b', desc: 'כלי בית, עיצוב, אביזרים' },
  { id: 'kitchen', name: 'מטבח בריא', icon: 'fa-utensils', color: '#ef4444', desc: 'כלי מטבח, סופרפודים, אביזרים' },
  { id: 'sport', name: 'ספורט וכושר', icon: 'fa-dumbbell', color: '#06b6d4', desc: 'ציוד ספורט, כושר, בריאות' },
  { id: 'baby', name: 'תינוקות וילדים', icon: 'fa-baby', color: '#ec4899', desc: 'מוצרים לתינוקות וילדים' },
  { id: 'beauty', name: 'יופי וטיפוח', icon: 'fa-spa', color: '#a855f7', desc: 'קוסמטיקה טבעית, טיפוח' }
];

const products = [
  // Health
  { id: 1, name: 'ויטמין D3 + K2 פרימיום', category: 'health', price: 89, oldPrice: 119, rating: 4.8, reviews: 245, icon: 'fa-pills', emoji: '💊', featured: true, badge: 'sale', desc: 'תוסף איכותי לחיזוק העצמות ומערכת החיסון' },
  { id: 2, name: 'אומגה 3 טהור מדגי ים עמוקים', category: 'health', price: 129, rating: 4.9, reviews: 412, icon: 'fa-fish', emoji: '🐟', featured: true, badge: 'hot', desc: 'EPA + DHA במינון מיטבי' },
  { id: 3, name: 'כורכומין עם פיפרין', category: 'health', price: 79, oldPrice: 99, rating: 4.7, reviews: 189, icon: 'fa-capsules', emoji: '💛', badge: 'sale' },
  { id: 4, name: 'מגנזיום ביסגליצינאט', category: 'health', price: 95, rating: 4.8, reviews: 321, icon: 'fa-tablets', emoji: '⚪', featured: true },
  { id: 5, name: 'אבקת ספירולינה אורגנית', category: 'health', price: 65, rating: 4.6, reviews: 156, icon: 'fa-leaf', emoji: '🌿' },
  { id: 6, name: 'פרוביוטיקה 50 מיליארד', category: 'health', price: 149, rating: 4.9, reviews: 287, icon: 'fa-microscope', emoji: '🦠', featured: true, badge: 'new' },

  // Agriculture
  { id: 7, name: 'ערכת גינון אנכי לבית', category: 'agriculture', price: 299, oldPrice: 399, rating: 4.7, reviews: 134, icon: 'fa-seedling', emoji: '🌱', featured: true, badge: 'sale', desc: 'גן עירוני במינימום מקום' },
  { id: 8, name: 'מערכת השקיה חכמה WiFi', category: 'agriculture', price: 459, rating: 4.8, reviews: 98, icon: 'fa-faucet', emoji: '💧', featured: true, badge: 'hot' },
  { id: 9, name: 'ערכת זרעים אורגניים 30 סוגים', category: 'agriculture', price: 89, rating: 4.6, reviews: 245, icon: 'fa-seedling', emoji: '🌾' },
  { id: 10, name: 'קומפוסטר ביתי חכם', category: 'agriculture', price: 599, rating: 4.9, reviews: 67, icon: 'fa-recycle', emoji: '♻️', badge: 'new' },
  { id: 11, name: 'גן אורגני אוטומטי', category: 'agriculture', price: 1299, rating: 4.8, reviews: 45, icon: 'fa-leaf', emoji: '🌿', featured: true },
  { id: 12, name: 'דשן אורגני מולטי-נוטריינט', category: 'agriculture', price: 49, rating: 4.5, reviews: 178, icon: 'fa-flask', emoji: '🌻' },

  // Tech
  { id: 13, name: 'רובוט שואב חכם AI', category: 'tech', price: 1899, oldPrice: 2499, rating: 4.8, reviews: 523, icon: 'fa-robot', emoji: '🤖', featured: true, badge: 'sale' },
  { id: 14, name: 'מסך חכם 27" 4K', category: 'tech', price: 1599, rating: 4.9, reviews: 234, icon: 'fa-desktop', emoji: '🖥️', featured: true },
  { id: 15, name: 'אוזניות אלחוטיות ANC', category: 'tech', price: 549, oldPrice: 699, rating: 4.7, reviews: 678, icon: 'fa-headphones', emoji: '🎧', badge: 'sale' },
  { id: 16, name: 'שעון חכם פרימיום', category: 'tech', price: 1299, rating: 4.8, reviews: 412, icon: 'fa-clock', emoji: '⌚', featured: true, badge: 'hot' },
  { id: 17, name: 'מטען אלחוטי 3-ב-1', category: 'tech', price: 199, rating: 4.6, reviews: 289, icon: 'fa-bolt', emoji: '⚡' },
  { id: 18, name: 'מצלמת בית חכמה 360°', category: 'tech', price: 349, rating: 4.7, reviews: 156, icon: 'fa-video', emoji: '📹', badge: 'new' },

  // Home
  { id: 19, name: 'מטהר אוויר HEPA חכם', category: 'home', price: 899, oldPrice: 1199, rating: 4.8, reviews: 312, icon: 'fa-wind', emoji: '💨', featured: true, badge: 'sale' },
  { id: 20, name: 'מנורת LED חכמה RGB', category: 'home', price: 179, rating: 4.6, reviews: 234, icon: 'fa-lightbulb', emoji: '💡' },
  { id: 21, name: 'סט מצעי במבוק אקולוגי', category: 'home', price: 449, rating: 4.9, reviews: 189, icon: 'fa-bed', emoji: '🛏️', featured: true },
  { id: 22, name: 'מפזר ארומה אולטרסוני', category: 'home', price: 159, rating: 4.7, reviews: 267, icon: 'fa-spa', emoji: '🌸' },

  // Kitchen
  { id: 23, name: 'בלנדר ואקום פרימיום', category: 'kitchen', price: 799, oldPrice: 999, rating: 4.8, reviews: 145, icon: 'fa-blender', emoji: '🥤', badge: 'sale' },
  { id: 24, name: 'סט סכינים יפניים', category: 'kitchen', price: 599, rating: 4.9, reviews: 234, icon: 'fa-utensils', emoji: '🔪', featured: true },
  { id: 25, name: 'מסחטת מיצים איטית', category: 'kitchen', price: 1299, rating: 4.8, reviews: 178, icon: 'fa-glass-water', emoji: '🍹', badge: 'hot' },
  { id: 26, name: 'אבקת מאצ׳ה יפנית פרימיום', category: 'kitchen', price: 119, rating: 4.7, reviews: 156, icon: 'fa-mug-hot', emoji: '🍵' },

  // Sport
  { id: 27, name: 'מזרן יוגה אקולוגי', category: 'sport', price: 249, rating: 4.8, reviews: 234, icon: 'fa-person-praying', emoji: '🧘', featured: true },
  { id: 28, name: 'משקולות מתכווננות 24kg', category: 'sport', price: 899, oldPrice: 1099, rating: 4.9, reviews: 178, icon: 'fa-dumbbell', emoji: '🏋️', badge: 'sale' },
  { id: 29, name: 'אופני כושר חכמים', category: 'sport', price: 2999, rating: 4.7, reviews: 89, icon: 'fa-bicycle', emoji: '🚴', badge: 'new' },
  { id: 30, name: 'רצועות התנגדות פרו', category: 'sport', price: 129, rating: 4.6, reviews: 312, icon: 'fa-link', emoji: '💪' },

  // Baby
  { id: 31, name: 'מוניטור תינוק חכם', category: 'baby', price: 699, rating: 4.9, reviews: 167, icon: 'fa-baby', emoji: '👶', featured: true },
  { id: 32, name: 'מטהר בקבוקים UV', category: 'baby', price: 299, rating: 4.8, reviews: 134, icon: 'fa-baby-carriage', emoji: '🍼' },

  // Beauty
  { id: 33, name: 'סרום ויטמין C טהור', category: 'beauty', price: 189, oldPrice: 249, rating: 4.8, reviews: 456, icon: 'fa-droplet', emoji: '✨', featured: true, badge: 'sale' },
  { id: 34, name: 'מסכת LED לטיפוח פנים', category: 'beauty', price: 899, rating: 4.7, reviews: 123, icon: 'fa-mask', emoji: '💆', badge: 'new' },
  { id: 35, name: 'שמן ארגן אורגני 100%', category: 'beauty', price: 99, rating: 4.9, reviews: 287, icon: 'fa-bottle-droplet', emoji: '🪔' },
  { id: 36, name: 'מברשת חשמלית לפנים', category: 'beauty', price: 349, rating: 4.6, reviews: 198, icon: 'fa-brush', emoji: '🌺' }
];
