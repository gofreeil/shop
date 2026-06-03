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
  const cat = categories.find(c => c.id === p.category);
  const inWish = wishlist.includes(p.id);
  const badge = p.badge ? `<span class="product-badge ${p.badge}">${p.badge === 'sale' ? 'מבצע' : p.badge === 'new' ? 'חדש' : 'חם'}</span>` : '';
  const oldPrice = p.oldPrice ? `<span class="product-price-old">₪${p.oldPrice}</span>` : '';
  return `
    <div class="product-card" data-id="${p.id}">
      <div class="product-image" style="background: linear-gradient(135deg, ${cat.color}22, ${cat.color}11)">
        <span style="font-size:80px">${p.emoji || '📦'}</span>
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
        <div class="product-rating">
          <span class="stars">★★★★★</span>
          <span>${p.rating} (${p.reviews})</span>
        </div>
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
  const cat = categories.find(c => c.id === p.category);
  const modal = document.getElementById('quickViewModal');
  const content = document.getElementById('quickViewContent');
  content.innerHTML = `
    <button class="modal-close" onclick="closeQuickView()"><i class="fas fa-times"></i></button>
    <div class="quick-view">
      <div class="quick-view-image" style="background: linear-gradient(135deg, ${cat.color}22, ${cat.color}11)">
        <span>${p.emoji || '📦'}</span>
      </div>
      <div class="quick-view-info">
        <span class="product-category" style="color:${cat.color}">${cat.name}</span>
        <h2>${p.name}</h2>
        <div class="product-rating" style="margin:12px 0">
          <span class="stars">★★★★★</span>
          <span>${p.rating} (${p.reviews} ביקורות)</span>
        </div>
        <p style="color:var(--text-muted);margin:16px 0">${p.desc || 'מוצר איכותי שעבר בדיקות קפדניות. אנחנו עומדים מאחורי כל פריט שאנו מוכרים, עם אחריות מלאה ומחויבות לאיכות.'}</p>
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
      const cat = categories.find(c => c.id === p.category);
      return `
        <a href="products.html?search=${encodeURIComponent(q)}" class="search-result" onclick="openQuickView(${p.id});event.preventDefault()">
          <div class="search-result-img" style="background:${cat.color}22">${p.emoji}</div>
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
function handleLogin(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const saved = JSON.parse(localStorage.getItem('noshop_users') || '{}');
  const user = saved[data.email];
  if (!user || user.password !== data.password) {
    toast('אימייל או סיסמה שגויים', 'fa-circle-exclamation');
    return;
  }
  currentUser = { name: user.name, email: user.email };
  localStorage.setItem(STORAGE.USER, JSON.stringify(currentUser));
  updateAccountBtn();
  closeAuth();
  toast(`שלום ${user.name}!`, 'fa-hand-wave');
}
function handleRegister(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const saved = JSON.parse(localStorage.getItem('noshop_users') || '{}');
  if (saved[data.email]) {
    toast('כבר קיים חשבון עם המייל הזה', 'fa-circle-exclamation');
    return;
  }
  const cardLast4 = data.card ? data.card.replace(/\s/g, '').slice(-4) : '';
  saved[data.email] = {
    name: data.name, email: data.email, password: data.password,
    cardLast4, expiry: data.expiry || '', cvv: data.cvv || ''
  };
  localStorage.setItem('noshop_users', JSON.stringify(saved));
  currentUser = { name: data.name, email: data.email };
  localStorage.setItem(STORAGE.USER, JSON.stringify(currentUser));
  updateAccountBtn();
  closeAuth();
  toast(`ברוך הבא ${data.name}!`, 'fa-circle-check');
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
      <button class="btn btn-ghost btn-block" onclick="logoutUser()" style="justify-content:flex-start;color:#ef4444"><i class="fas fa-sign-out-alt"></i> התנתקות</button>
    </div>
  `;
}
function logoutUser() {
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
