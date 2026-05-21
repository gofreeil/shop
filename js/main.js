// === State ===
const STORAGE = { CART: 'noshop_cart', WISHLIST: 'noshop_wishlist', THEME: 'noshop_theme' };
let cart = JSON.parse(localStorage.getItem(STORAGE.CART) || '[]');
let wishlist = JSON.parse(localStorage.getItem(STORAGE.WISHLIST) || '[]');

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
  el.innerHTML = categories.slice(0, 4).map(c => {
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
  updateCartCount();
  updateWishlistCount();
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
  document.querySelector('#quickViewModal .modal-overlay')?.addEventListener('click', closeQuickView);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeQuickView(); });
});
