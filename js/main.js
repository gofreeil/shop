// === State ===
const STORAGE = { CART: 'noshop_cart', WISHLIST: 'noshop_wishlist', THEME: 'noshop_theme', USER: 'noshop_user' };
let cart = JSON.parse(localStorage.getItem(STORAGE.CART) || '[]');
let wishlist = JSON.parse(localStorage.getItem(STORAGE.WISHLIST) || '[]');
let currentUser = JSON.parse(localStorage.getItem(STORAGE.USER) || 'null');

// === Theme (dark only) ===
function initTheme() {}
function toggleTheme() {}
function updateThemeIcon() {}

// === Toast ===
function toast(msg, icon = 'fa-check-circle') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = `<i class="fas ${icon}"></i> ${msg}`;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}

// === Cart ===
function saveCart() {
  localStorage.setItem(STORAGE.CART, JSON.stringify(cart));
  updateCartCount();
}
function addToCart(productId, qty = 1) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  const existing = cart.find(i => i.id === productId);
  if (existing) existing.qty += qty;
  else cart.push({ id: productId, qty });
  saveCart();
  toast(`${product.name} נוסף לעגלה`);
}
function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  saveCart();
  if (typeof renderCart === 'function') renderCart();
}
function updateQty(productId, qty) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty = Math.max(1, qty);
  saveCart();
  if (typeof renderCart === 'function') renderCart();
}
function updateCartCount() {
  const el = document.getElementById('cartCount');
  if (el) el.textContent = cart.reduce((s, i) => s + i.qty, 0);
}

// === Wishlist ===
function toggleWishlist(productId) {
  if (wishlist.includes(productId)) {
    wishlist = wishlist.filter(id => id !== productId);
    toast('הוסר מהמועדפים', 'fa-heart-broken');
  } else {
    wishlist.push(productId);
    toast('נוסף למועדפים', 'fa-heart');
  }
  localStorage.setItem(STORAGE.WISHLIST, JSON.stringify(wishlist));
  updateWishlistCount();
  document.querySelectorAll(`[data-wishlist="${productId}"]`).forEach(btn => {
    btn.classList.toggle('active', wishlist.includes(productId));
    btn.innerHTML = wishlist.includes(productId) ? '<i class="fas fa-heart" style="color:#ef4444"></i>' : '<i class="far fa-heart"></i>';
  });
}
function updateWishlistCount() {
  const el = document.getElementById('wishlistCount');
  if (el) el.textContent = wishlist.length;
}

// === Render ===
function productCard(p) {
  const cat = categories.find(c => c.id === p.category) || categories[0];
  const inWish = wishlist.includes(p.id);
  const badge = p.badge ? `<span class="product-badge ${p.badge}">${p.badge === 'sale' ? 'מבצע' : p.badge === 'new' ? 'חדש' : 'חם'}</span>` : '';
  const oldPrice = p.oldPrice ? `<span class="product-price-old">₪${p.oldPrice}</span>` : '';
  return `
    <div class="product-card" data-id="${p.id}">
      <div class="product-image" style="background: linear-gradient(135deg, ${cat.color}22, ${cat.color}11)">
        ${p.image ? `<img class="product-photo" src="${p.image}" alt="${p.name}" loading="lazy">` : `<span style="font-size:80px">${p.emoji || '📦'}</span>`}
        <div class="product-badges">${badge}</div>
        <div class="product-actions">
          <button onclick="openQuickView(${p.id})"><i class="fas fa-eye"></i> צפייה</button>
          <button class="icon-only" onclick="toggleWishlist(${p.id})" data-wishlist="${p.id}">
            ${inWish ? '<i class="fas fa-heart" style="color:#ef4444"></i>' : '<i class="far fa-heart"></i>'}
          </button>
        </div>
      </div>
      <div class="product-info">
        <span class="product-category">${cat.name}</span>
        <h3 class="product-name">${p.name}</h3>
        ${p.seller
          ? `<a class="product-seller" href="store.html?s=${encodeURIComponent(p.storeSlug || storeSlug(p.seller))}" title="לדף החנות">${p.storeLogo ? `<img src="${p.storeLogo}" alt="">` : '<i class="fas fa-store"></i>'} ${p.seller}</a>`
          : `<div class="product-rating">
          <span class="stars">★★★★★</span>
          <span>${p.rating} (${p.reviews})</span>
        </div>`}
        <div class="product-price-row">
          <div><span class="product-price">₪${p.price}</span>${oldPrice}</div>
          <button class="product-add" onclick="addToCart(${p.id})" title="הוסף לעגלה"><i class="fas fa-plus"></i></button>
        </div>
      </div>
    </div>
  `;
}
function renderProducts(containerId, list) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!list.length) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-search"></i><h2>לא נמצאו מוצרים</h2><p>נסה לשנות את הסינון</p></div>`;
    return;
  }
  el.innerHTML = list.map(productCard).join('');
}
function renderCategories() {
  const el = document.getElementById('categoriesGrid');
  if (!el) return;
  el.innerHTML = categories.map(c => {
    const count = products.filter(p => p.category === c.id).length;
    return `
      <a href="products.html?category=${c.id}" class="category-card">
        <div class="category-icon" style="background: linear-gradient(135deg, ${c.color}, ${c.color}dd)">
          <i class="fas ${c.icon}"></i>
        </div>
        <h3>${c.name}</h3>
        <p>${c.desc}</p>
        <span class="count">${count} מוצרים <i class="fas fa-arrow-left"></i></span>
      </a>
    `;
  }).join('');
}

// === Quick View ===
function openQuickView(productId) {
  const p = products.find(x => x.id === productId);
  if (!p) return;
  const cat = categories.find(c => c.id === p.category) || categories[0];
  const modal = document.getElementById('quickViewModal');
  const content = document.getElementById('quickViewContent');
  content.innerHTML = `
    <button class="modal-close" onclick="closeQuickView()"><i class="fas fa-times"></i></button>
    <div class="quick-view">
      <div class="quick-view-image" style="background: linear-gradient(135deg, ${cat.color}22, ${cat.color}11)">
        ${p.image ? `<img src="${p.image}" alt="${p.name}">` : `<span>${p.emoji || '📦'}</span>`}
      </div>
      <div class="quick-view-info">
        <span class="product-category" style="color:${cat.color}">${cat.name}</span>
        <h2>${p.name}</h2>
        ${p.seller ? '' : `<div class="product-rating" style="margin:12px 0">
          <span class="stars">★★★★★</span>
          <span>${p.rating} (${p.reviews} ביקורות)</span>
        </div>`}
        ${p.seller
          ? `<p style="color:var(--text-muted);margin:16px 0">${p.desc || ''}</p>
        <div class="seller-note">
          ${storeLogoHtml(p, 48)}
          <div>נמכר ומסופק על ידי <a href="store.html?s=${encodeURIComponent(p.storeSlug || storeSlug(p.seller))}"><strong>${p.seller}</strong></a>${p.storeCity ? ` · ${p.storeCity}` : ''}${p.deliveryDays ? ` · אספקה תוך ${p.deliveryDays} ימי עסקים` : ''}${p.quantity ? ` · ${p.quantity} יח' במלאי` : ''}
            <div class="store-contact">
              ${p.storePhone ? `<a href="tel:${p.storePhone}"><i class="fas fa-phone"></i> ${p.storePhone}</a>` : ''}
              ${waLink(p.storeWhatsapp || p.storePhone) ? `<a href="${waLink(p.storeWhatsapp || p.storePhone)}" target="_blank" rel="noopener" class="wa"><i class="fab fa-whatsapp"></i> וואטסאפ</a>` : ''}
              <a href="store.html?s=${encodeURIComponent(p.storeSlug || storeSlug(p.seller))}"><i class="fas fa-store"></i> לדף החנות</a>
            </div>
            <small>האחריות למוצר, לאספקה, לאחריות ולשירות חלה על המוכר, לפי <a href="contract.html">הסכם המוכר</a>.</small></div>
        </div>`
          : `<p style="color:var(--text-muted);margin:16px 0">${p.desc || 'מוצר איכותי שעבר בדיקות קפדניות. אנחנו עומדים מאחורי כל פריט שאנו מוכרים, עם אחריות מלאה ומחויבות לאיכות.'}</p>`}
        <div style="display:flex;align-items:center;gap:12px;margin:20px 0">
          <span class="product-price" style="font-size:32px">₪${p.price}</span>
          ${p.oldPrice ? `<span class="product-price-old" style="font-size:18px">₪${p.oldPrice}</span>` : ''}
        </div>
        <div style="display:flex;gap:12px">
          <button class="btn btn-primary btn-block" onclick="addToCart(${p.id}); closeQuickView()">
            <i class="fas fa-shopping-bag"></i> הוסף לעגלה
          </button>
          <button class="btn btn-ghost" onclick="toggleWishlist(${p.id})" data-wishlist="${p.id}">
            <i class="${wishlist.includes(p.id) ? 'fas' : 'far'} fa-heart"></i>
          </button>
        </div>
        <div style="margin-top:24px;padding-top:24px;border-top:1px solid var(--border);display:grid;gap:8px;font-size:14px;color:var(--text-muted)">
          <div><i class="fas fa-truck" style="color:var(--primary);width:24px"></i> משלוח חינם מעל 199₪</div>
          <div><i class="fas fa-rotate-left" style="color:var(--primary);width:24px"></i> החזרה תוך 30 יום</div>
          <div><i class="fas fa-shield-halved" style="color:var(--primary);width:24px"></i> תשלום מאובטח SSL</div>
        </div>
      </div>
    </div>
    <div class="quick-view-reviews">
      <h3>מה לקוחות אומרים</h3>
      <div class="testimonials-grid">
        <div class="testimonial">
          <div class="stars">★★★★★</div>
          <p>"שירות מצוין, משלוח מהיר ומוצרים איכותיים. אני קונה כאן כבר שנה!"</p>
          <div class="testimonial-author">
            <div class="avatar">ש</div>
            <div><strong>שרה כהן</strong><span>תל אביב</span></div>
          </div>
        </div>
        <div class="testimonial">
          <div class="stars">★★★★★</div>
          <p>"מוצאת כאן דברים שלא מצאתי בשום מקום אחר. ממליצה בחום!"</p>
          <div class="testimonial-author">
            <div class="avatar">ר</div>
            <div><strong>רחל לוי</strong><span>ירושלים</span></div>
          </div>
        </div>
        <div class="testimonial">
          <div class="stars">★★★★★</div>
          <p>"האתר נוח, החיפוש מעולה והמחירים הוגנים. כל הכבוד!"</p>
          <div class="testimonial-author">
            <div class="avatar">י</div>
            <div><strong>יוסי אברהם</strong><span>חיפה</span></div>
          </div>
        </div>
      </div>
    </div>
  `;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeQuickView() {
  document.getElementById('quickViewModal').classList.remove('active');
  document.body.style.overflow = '';
}

// === Search ===
function initSearch() {
  const toggle = document.getElementById('searchToggle');
  const bar = document.getElementById('searchBar');
  const close = document.getElementById('searchClose');
  const input = document.getElementById('searchInput');
  const suggestions = document.getElementById('searchSuggestions');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    bar.classList.toggle('active');
    if (bar.classList.contains('active')) setTimeout(() => input.focus(), 100);
  });
  close?.addEventListener('click', () => bar.classList.remove('active'));

  input?.addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) { suggestions.innerHTML = ''; return; }
    const results = products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      categories.find(c => c.id === p.category && c.name.includes(q))
    ).slice(0, 6);
    suggestions.innerHTML = results.length ? results.map(p => {
      const cat = categories.find(c => c.id === p.category) || categories[0];
      return `
        <a href="products.html?search=${encodeURIComponent(q)}" class="search-result" onclick="openQuickView(${p.id});event.preventDefault()">
          <div class="search-result-img" style="background:${cat.color}22">${p.image ? `<img src="${p.image}" alt="">` : p.emoji}</div>
          <div class="search-result-info">
            <div class="search-result-name">${p.name}</div>
            <div style="font-size:12px;color:var(--text-muted)">${cat.name}</div>
          </div>
          <div class="search-result-price">₪${p.price}</div>
        </a>
      `;
    }).join('') : '<div style="text-align:center;padding:20px;color:var(--text-muted)">לא נמצאו תוצאות</div>';
  });
}

// === Construction Banner ===
function injectConstructionBanner() {
  if (document.getElementById('constructionBanner')) return;
  const banner = document.createElement('div');
  banner.id = 'constructionBanner';
  banner.className = 'construction-banner';
  banner.innerHTML = `
    <span><i class="fas fa-triangle-exclamation"></i> אתר זה בבנייה - חלק מהפיצ'רים עדיין לא פעילים. תודה על הסבלנות!</span>
    <button class="construction-close" onclick="this.parentElement.remove()" aria-label="סגור"><i class="fas fa-times"></i></button>
  `;
  document.body.insertBefore(banner, document.body.firstChild);
}

// === Auth ===
function injectAccountUI() {
  const actions = document.querySelector('.header-actions');
  if (!actions || document.getElementById('accountBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'accountBtn';
  btn.className = 'icon-btn';
  btn.setAttribute('aria-label', 'חשבון');
  btn.onclick = () => currentUser ? openAccountMenu() : openAuth('login');
  updateAccountBtn(btn);
  actions.insertBefore(btn, actions.firstChild);
}
function updateAccountBtn(btn) {
  btn = btn || document.getElementById('accountBtn');
  // דפים שתלויים בזהות (למשל "המוצרים שלי" ב-sell.html) מאזינים לאירוע הזה
  document.dispatchEvent(new CustomEvent('userChanged', { detail: { user: currentUser } }));
  if (!btn) return;
  btn.innerHTML = currentUser
    ? `<span style="background:var(--primary);color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700">${currentUser.name.charAt(0)}</span>`
    : '<i class="fas fa-user"></i>';
}

function openAuth(tab = 'login') {
  const modal = ensureAuthModal();
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  switchAuthTab(tab);
}
function closeAuth() {
  document.getElementById('authModal')?.classList.remove('active');
  document.body.style.overflow = '';
}
function switchAuthTab(tab) {
  document.querySelectorAll('#authModal .auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('#authModal .auth-form').forEach(f => f.classList.toggle('active', f.dataset.tab === tab));
}
function ensureAuthModal() {
  let modal = document.getElementById('authModal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'authModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeAuth()"></div>
    <div class="modal-content" style="max-width:480px">
      <button class="modal-close" onclick="closeAuth()"><i class="fas fa-times"></i></button>
      <div class="auth-tabs">
        <button class="auth-tab active" data-tab="login" onclick="switchAuthTab('login')">התחברות</button>
        <button class="auth-tab" data-tab="register" onclick="switchAuthTab('register')">הרשמה</button>
      </div>

      <!-- הודעה ברורה למשתמש חדש: בפעם הראשונה יש להירשם תחילה -->
      <p style="text-align:center;font-size:13px;font-weight:700;line-height:1.6;color:#fcd34d;margin-bottom:16px">
        👋 פעם ראשונה כאן? יש להירשם תחילה — ואז ניתן להישאר מחובר במכשיר זה.
      </p>

      <button type="button" onclick="loginWithCommunity()" class="btn btn-block login-grad" style="margin-bottom:14px;color:#fff;font-weight:700">
        🕊️ התחבר דרך "יוצאים לחירות"
      </button>
      <p style="text-align:center;font-size:12px;color:var(--text-muted);margin-bottom:16px">
        רשום כבר בקהילה או באתר אחר של יוצאים לחירות? נזהה אותך אוטומטית.
      </p>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
        <div style="flex:1;height:1px;background:var(--border)"></div>
        <span style="font-size:12px;color:var(--text-muted)">או</span>
        <div style="flex:1;height:1px;background:var(--border)"></div>
      </div>

      <form class="auth-form active" data-tab="login" onsubmit="handleLogin(event)">
        <h2 style="font-size:22px;margin-bottom:6px">ברוך הבא</h2>
        <p style="color:var(--text-muted);margin-bottom:20px;font-size:14px">התחבר לחשבון שלך</p>
        <div class="form-grid">
          <div class="form-field"><label>אימייל</label><input type="email" name="email" required></div>
          <div class="form-field"><label>סיסמה</label><input type="password" name="password" required></div>
          <button type="submit" class="btn btn-primary btn-block">התחבר</button>
        </div>
      </form>

      <form class="auth-form" data-tab="register" onsubmit="handleRegister(event)">
        <h2 style="font-size:22px;margin-bottom:6px">פתיחת חשבון</h2>
        <p style="color:var(--text-muted);margin-bottom:16px;font-size:14px">צור חשבון כדי לשמור מועדפים ולקנות מהר יותר</p>
        <div class="form-grid">
          <div class="form-field"><label>שם מלא</label><input type="text" name="name" required></div>
          <div class="form-field"><label>אימייל</label><input type="email" name="email" required></div>
          <div class="form-field"><label>סיסמה</label><input type="password" name="password" required minlength="4"></div>
          <div style="margin-top:10px;padding:12px 14px;background:var(--bg-alt);border-radius:10px;font-size:13px;color:var(--text-muted);border:1px solid var(--border)">
            <strong style="display:block;color:var(--text);margin-bottom:4px"><i class="fas fa-credit-card"></i> פרטי תשלום (אופציונלי)</strong>
            ⚠️ דמו בלבד - אל תזין פרטי כרטיס אמיתיים.
          </div>
          <div class="form-field"><label>מספר כרטיס אשראי</label><input type="text" name="card" inputmode="numeric" placeholder="1234 5678 9012 3456" maxlength="19"></div>
          <div class="form-row">
            <div class="form-field"><label>תוקף</label><input type="text" name="expiry" placeholder="MM/YY" maxlength="5"></div>
            <div class="form-field"><label>CVV</label><input type="text" name="cvv" inputmode="numeric" placeholder="123" maxlength="4"></div>
          </div>
          <button type="submit" class="btn btn-primary btn-block">פתח חשבון</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}
// התחברות דרך יוצאים לחירות (SSO): הקהילה שותלת את העוגייה המשותפת gofreeil-auth,
// חוזרת לחנות, ואז /api/me מזהה את המשתמש.
function loginWithCommunity() {
  const callback = `${window.location.origin}/`;
  window.location.href = `https://community.gofreeil.com/sso?callback=${encodeURIComponent(callback)}`;
}

async function handleLogin(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email, password: data.password })
    });
    if (!res.ok) { toast('אימייל או סיסמה שגויים', 'fa-circle-exclamation'); return; }
    const { user } = await res.json();
    currentUser = { name: user.name, email: user.email };
    localStorage.setItem(STORAGE.USER, JSON.stringify(currentUser));
    updateAccountBtn();
    closeAuth();
    toast(`שלום ${user.name}!`, 'fa-hand-wave');
  } catch {
    toast('שגיאת התחברות, נסה שוב', 'fa-circle-exclamation');
  }
}
async function handleRegister(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: data.name, email: data.email, password: data.password })
    });
    if (!res.ok) { toast('כבר קיים חשבון עם המייל הזה', 'fa-circle-exclamation'); return; }
    const { user } = await res.json();
    currentUser = { name: user.name, email: user.email };
    localStorage.setItem(STORAGE.USER, JSON.stringify(currentUser));
    updateAccountBtn();
    closeAuth();
    toast(`ברוך הבא ${user.name}!`, 'fa-circle-check');
  } catch {
    toast('שגיאת הרשמה, נסה שוב', 'fa-circle-exclamation');
  }
}
// מזהה משתמש מחובר לפי העוגייה המשותפת (בטעינת הדף / חזרה מ-SSO)
async function hydrateUser() {
  try {
    const res = await fetch('/api/me');
    const { user } = await res.json();
    if (user) {
      currentUser = { name: user.name, email: user.email };
      localStorage.setItem(STORAGE.USER, JSON.stringify(currentUser));
    } else if (currentUser) {
      currentUser = null;
      localStorage.removeItem(STORAGE.USER);
    }
    updateAccountBtn();
  } catch { /* ignore - offline */ }
}
function openAccountMenu() {
  const modal = ensureAccountMenuModal();
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeAccountMenu() {
  document.getElementById('accountMenu')?.classList.remove('active');
  document.body.style.overflow = '';
}
function ensureAccountMenuModal() {
  let modal = document.getElementById('accountMenu');
  if (modal) { renderAccountMenu(); return modal; }
  modal = document.createElement('div');
  modal.id = 'accountMenu';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeAccountMenu()"></div>
    <div class="modal-content" style="max-width:420px" id="accountMenuContent"></div>
  `;
  document.body.appendChild(modal);
  renderAccountMenu();
  return modal;
}
function renderAccountMenu() {
  const content = document.getElementById('accountMenuContent');
  if (!content || !currentUser) return;
  content.innerHTML = `
    <button class="modal-close" onclick="closeAccountMenu()"><i class="fas fa-times"></i></button>
    <div style="text-align:center;margin-bottom:20px">
      <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-light));color:white;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;margin:0 auto 12px">${currentUser.name.charAt(0)}</div>
      <h2 style="font-size:20px;margin-bottom:4px">${currentUser.name}</h2>
      <p style="color:var(--text-muted);font-size:13px">${currentUser.email}</p>
    </div>
    <div style="display:grid;gap:6px">
      <button class="btn btn-ghost btn-block" onclick="closeAccountMenu();openWishlist()" style="justify-content:flex-start"><i class="fas fa-heart" style="color:#ef4444"></i> המועדפים שלי <span style="margin-right:auto;color:var(--text-muted)">${wishlist.length}</span></button>
      <a href="cart.html" class="btn btn-ghost btn-block" style="justify-content:flex-start"><i class="fas fa-shopping-bag"></i> העגלה שלי</a>
      <a href="sell.html#mine" class="btn btn-ghost btn-block" style="justify-content:flex-start"><i class="fas fa-store"></i> המוצרים שהגשתי למכירה</a>
      <button class="btn btn-ghost btn-block" onclick="logoutUser()" style="justify-content:flex-start;color:#ef4444"><i class="fas fa-sign-out-alt"></i> התנתקות</button>
    </div>
  `;
}
async function logoutUser() {
  try { await fetch('/api/logout', { method: 'POST' }); } catch { /* ignore */ }
  currentUser = null;
  localStorage.removeItem(STORAGE.USER);
  updateAccountBtn();
  closeAccountMenu();
  toast('התנתקת בהצלחה', 'fa-circle-check');
}

// === Wishlist Viewer ===
function openWishlist() {
  const modal = ensureWishlistModal();
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  renderWishlistModal();
}
function closeWishlist() {
  document.getElementById('wishlistModal')?.classList.remove('active');
  document.body.style.overflow = '';
}
function ensureWishlistModal() {
  let modal = document.getElementById('wishlistModal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'wishlistModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeWishlist()"></div>
    <div class="modal-content" style="max-width:760px" id="wishlistContent"></div>
  `;
  document.body.appendChild(modal);
  return modal;
}
function renderWishlistModal() {
  const content = document.getElementById('wishlistContent');
  if (!content) return;
  const items = wishlist.map(id => products.find(p => p.id === id)).filter(Boolean);
  content.innerHTML = `
    <button class="modal-close" onclick="closeWishlist()"><i class="fas fa-times"></i></button>
    <h2 style="font-size:22px;margin-bottom:16px"><i class="fas fa-heart" style="color:#ef4444"></i> המועדפים שלי</h2>
    ${items.length === 0
      ? `<div class="empty-state"><i class="far fa-heart"></i><h2>אין מועדפים עדיין</h2><p>לחץ על ❤️ על מוצר כדי להוסיף אותו לכאן</p></div>`
      : `<div class="products-grid" style="grid-template-columns:repeat(3,1fr)">${items.map(productCard).join('')}</div>`
    }
  `;
}

// === Seller products (מוצרים שהקהל הגיש ואושרו) ===
// נטענים מ-/api/seller-products (פרוקסי ל-Strapi המשותף) ומתמזגים לתוך products.
// הדפים מרנדרים קודם את המוצרים הקבועים, ומאזינים ל-productsUpdated כדי לרנדר מחדש.
// ב-dev מקומי (http-server בלי API) הקריאה נכשלת בשקט.
async function loadSellerProducts() {
  try {
    const res = await fetch('/api/seller-products');
    if (!res.ok) return;
    const { items } = await res.json();
    if (!Array.isArray(items) || !items.length) return;
    let added = 0;
    for (const p of items) {
      if (products.some(x => x.id === p.id)) continue;
      products.push(p);
      added++;
    }
    if (added) document.dispatchEvent(new CustomEvent('productsUpdated', { detail: { added } }));
  } catch { /* offline / dev ללא API */ }
}

// === Stores (הקניון השיתופי) ===
// חנות = קבוצת המוצרים המאושרים של אותו מוכר, לפי שם החנות. פרטי החנות (לוגו,
// טלפון, עיר...) נלקחים מהמוצר שאושר אחרון - כך עדכון בהגשה חדשה מתעדכן בכל המקומות.
function storeSlug(name) {
  return String(name || '').trim().toLowerCase().replace(/["'`]/g, '').replace(/[\s/]+/g, '-');
}
function waLink(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length < 9) return '';
  return `https://wa.me/${d.startsWith('0') ? '972' + d.slice(1) : d}`;
}
function storeLogoHtml(s, size = 56) {
  const logo = s.logo || s.storeLogo;
  const name = s.name || s.seller || s.store || '?';
  return logo
    ? `<img src="${logo}" alt="${name}" class="store-logo" style="width:${size}px;height:${size}px">`
    : `<span class="store-logo store-logo-letter" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.45)}px">${name.charAt(0)}</span>`;
}
function storesFromProducts() {
  const map = new Map();
  const sorted = [...products].filter(p => p.storeSlug || p.seller).sort((a, b) => Date.parse(b.approvedAt || 0) - Date.parse(a.approvedAt || 0));
  for (const p of sorted) {
    const slug = p.storeSlug || storeSlug(p.seller);
    let s = map.get(slug);
    if (!s) {
      s = { slug, name: p.store || p.seller, logo: p.storeLogo || '', phone: p.storePhone || '', whatsapp: p.storeWhatsapp || p.storePhone || '', city: p.storeCity || '', website: p.storeWebsite || '', description: p.storeDescription || '', products: [] };
      map.set(slug, s);
    } else {
      // מילוי חוסרים ממוצרים ישנים יותר
      for (const k of ['logo', 'phone', 'whatsapp', 'city', 'website', 'description']) {
        const src = { logo: p.storeLogo, phone: p.storePhone, whatsapp: p.storeWhatsapp, city: p.storeCity, website: p.storeWebsite, description: p.storeDescription }[k];
        if (!s[k] && src) s[k] = src;
      }
    }
    s.products.push(p);
  }
  return [...map.values()].sort((a, b) => b.products.length - a.products.length);
}
function storeCard(s) {
  const cats = [...new Set(s.products.map(p => (categories.find(c => c.id === p.category) || {}).name).filter(Boolean))].slice(0, 3);
  return `
    <a href="store.html?s=${encodeURIComponent(s.slug)}" class="store-card">
      ${storeLogoHtml(s, 64)}
      <div class="store-card-body">
        <h3>${s.name}</h3>
        <p>${s.description || cats.join(' · ')}</p>
        <div class="store-card-meta">
          <span><i class="fas fa-box"></i> ${s.products.length} מוצרים</span>
          ${s.city ? `<span><i class="fas fa-location-dot"></i> ${s.city}</span>` : ''}
          ${s.phone ? `<span><i class="fas fa-phone"></i> ${s.phone}</span>` : ''}
        </div>
      </div>
    </a>`;
}
function openStoreCard() {
  return `
    <a href="sell.html" class="store-card store-card-open">
      <span class="store-logo store-logo-letter" style="width:64px;height:64px;font-size:28px"><i class="fas fa-plus"></i></span>
      <div class="store-card-body">
        <h3>פתחו חנות בקניון</h3>
        <p>לוגו, טלפון ומוצרים לפי קטגוריות. החנות לוקחת 10% ממכירה, השאר אליכם.</p>
        <div class="store-card-meta"><span><i class="fas fa-arrow-left"></i> להגשת מוצר ראשון</span></div>
      </div>
    </a>`;
}
// מרנדר רשימת חנויות לתוך מיכל; withOpen = להוסיף כרטיס "פתחו חנות" בסוף
function renderStores(containerId, withOpen = true, limit = null) {
  const el = document.getElementById(containerId);
  if (!el) return;
  let list = storesFromProducts();
  if (limit) list = list.slice(0, limit);
  el.innerHTML = list.map(storeCard).join('') + (withOpen ? openStoreCard() : '');
  return list.length;
}

// === Newsletter ===
function handleNewsletter(e) {
  e.preventDefault();
  toast('הצטרפת בהצלחה! בדוק את האימייל שלך', 'fa-paper-plane');
  e.target.reset();
}

// === Init ===
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSearch();
  injectConstructionBanner();
  injectAccountUI();
  hydrateUser();
  loadSellerProducts();
  updateCartCount();
  updateWishlistCount();
  const wishBtn = document.getElementById('wishlistBtn');
  if (wishBtn) {
    wishBtn.removeAttribute('href');
    wishBtn.style.cursor = 'pointer';
    wishBtn.addEventListener('click', e => { e.preventDefault(); openWishlist(); });
  }
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
  document.querySelector('#quickViewModal .modal-overlay')?.addEventListener('click', closeQuickView);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeQuickView(); closeAuth(); closeWishlist(); closeAccountMenu(); }
  });
});
