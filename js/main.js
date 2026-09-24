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

// === אימות טפסים ידידותי ===
// לא סומכים על בועת השגיאה של הדפדפן: בדפדפנים פנימיים (וואטסאפ/פייסבוק) ובחלק
// מהטלפונים היא לא מופיעה, והלחיצה על "שליחה" נראית כמו קפיצה למעלה בלי סיבה.
// כאן: אומרים במילים מה חסר, מסמנים את השדה באדום וממקדים אליו.
function fieldLabel(el) {
  const box = el.closest('.form-field, .consent, label');
  const raw = box?.querySelector('label, strong')?.textContent || el.placeholder || el.name || '';
  return raw.replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ').trim() || 'שדה חובה';
}
function fieldProblem(el) {
  const v = el.validity;
  if (v.valueMissing) return el.type === 'checkbox' ? 'יש לסמן' : el.tagName === 'SELECT' ? 'יש לבחור' : 'יש למלא';
  if (v.typeMismatch && el.type === 'email') return 'כתובת אימייל לא תקינה';
  if (v.typeMismatch && el.type === 'url') return 'קישור לא תקין';
  if (v.rangeUnderflow) return `הערך קטן מדי (מינימום ${el.min})`;
  if (v.rangeOverflow) return `הערך גדול מדי (מקסימום ${el.max})`;
  if (v.stepMismatch) return 'מספר לא תקין';
  if (v.badInput) return 'יש להקליד מספר';
  if (v.tooLong) return 'הטקסט ארוך מדי';
  return 'הערך לא תקין';
}
function markFieldInvalid(el) {
  el.classList.add('field-invalid');
  el.closest('.form-field, .consent')?.classList.add('has-error');
  const clear = () => { el.classList.remove('field-invalid'); el.closest('.form-field, .consent')?.classList.remove('has-error'); };
  el.addEventListener('input', clear, { once: true });
  el.addEventListener('change', clear, { once: true });
}
// מחזיר true אם הטופס תקין; אחרת מציג הודעה (ב-errEl אם יש, ובטוסט) וגולל לשדה הראשון
function validateFormFriendly(form, errEl) {
  // קישור בלי https:// - משלימים במקום לדחות
  form.querySelectorAll('input[type=url]').forEach(el => {
    const v = el.value.trim();
    if (v && !/^[a-z]+:\/\//i.test(v)) el.value = 'https://' + v;
  });
  const bad = [...form.elements].filter(el => el.willValidate && !el.checkValidity());
  if (!bad.length) return true;
  bad.forEach(markFieldInvalid);
  const first = bad[0];
  const msg = `${fieldProblem(first)}: ${fieldLabel(first)}` + (bad.length === 2 ? ' (ועוד שדה אחד מסומן באדום)' : bad.length > 2 ? ` (ועוד ${bad.length - 1} שדות מסומנים באדום)` : '');
  if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
  toast(msg, 'fa-circle-exclamation');
  first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => { try { first.focus({ preventScroll: true }); } catch {} }, 400);
  return false;
}
// טפסים שעדיין משתמשים באימות של הדפדפן: תופסים את השדה הלא-תקין הראשון בכל
// ניסיון שליחה ומוסיפים הסבר וסימון - גם כשהבועה של הדפדפן לא מופיעה
document.addEventListener('invalid', e => {
  const el = e.target;
  if (!el.form || el.form._invalidShown) return;
  el.form._invalidShown = true;
  setTimeout(() => { el.form._invalidShown = false; }, 50);
  markFieldInvalid(el);
  toast(`${fieldProblem(el)}: ${fieldLabel(el)}`, 'fa-circle-exclamation');
}, true);

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
  // דפים שמציגים את המועדפים (account.html) מאזינים ומתרעננים
  document.dispatchEvent(new CustomEvent('wishlistChanged', { detail: { wishlist } }));
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
  const badge = p.badge ? `<span class="product-badge ${p.badge}">${p.badge === 'sale' ? 'מבצע' : p.badge === 'new' ? 'חדש' : 'חם'}</span>` : '';
  const oldPrice = p.oldPrice ? `<span class="product-price-old">₪${p.oldPrice}</span>` : '';
  return `
    <div class="product-card" data-id="${p.id}">
      <div class="product-image" style="background: linear-gradient(135deg, ${cat.color}22, ${cat.color}11)">
        ${p.image ? `<img class="product-photo" src="${p.image}" alt="${p.name}" loading="lazy">` : `<span style="font-size:80px">${p.emoji || '📦'}</span>`}
        <div class="product-badges">${badge}</div>
      </div>
      <div class="product-info">
        <h3 class="product-name">${p.name}</h3>
        <div class="product-rating" data-rating-for="${p.id}">${ratingInner(p.id)}</div>
        <div class="product-price-row">
          <div><span class="product-price">₪${p.price}</span>${oldPrice}</div>
          <button class="product-add" onclick="addToCart(${p.id})" title="הוסף לעגלה"><i class="fas fa-plus"></i></button>
        </div>
      </div>
    </div>
  `;
}
// לחיצה בכל מקום בכרטיס מוצר פותחת את המוצר (חוץ מקישור החנות וכפתור ה-+).
// לחיצה ימנית פותחת תפריט קטן: הוספה לסל / סימון אהבתי.
document.addEventListener('click', e => {
  if (document.body.classList.contains('se-editing')) return;
  const card = e.target.closest('.product-card[data-id]');
  if (!card || e.target.closest('a, button, .success-preview')) return;
  openQuickView(Number(card.dataset.id));
});
function closeCardMenu() { document.getElementById('cardMenu')?.remove(); }
document.addEventListener('contextmenu', e => {
  closeCardMenu();
  if (document.body.classList.contains('se-editing')) return;
  const card = e.target.closest('.product-card[data-id]');
  if (!card || card.closest('.success-preview')) return;
  e.preventDefault();
  const id = Number(card.dataset.id);
  const inWish = wishlist.includes(id);
  const menu = document.createElement('div');
  menu.id = 'cardMenu';
  menu.className = 'card-menu';
  menu.innerHTML = `
    <button data-act="cart"><i class="fas fa-cart-plus"></i> הוסף לסל</button>
    <button data-act="wish">${inWish ? '<i class="fas fa-heart" style="color:#ef4444"></i> הסר מאהבתי' : '<i class="far fa-heart"></i> אהבתי'}</button>`;
  menu.addEventListener('click', ev => {
    const act = ev.target.closest('button')?.dataset.act;
    if (act === 'cart') addToCart(id);
    if (act === 'wish') toggleWishlist(id);
    closeCardMenu();
  });
  document.body.appendChild(menu);
  const r = menu.getBoundingClientRect();
  menu.style.left = Math.max(8, Math.min(e.clientX, innerWidth - r.width - 8)) + 'px';
  menu.style.top = Math.max(8, Math.min(e.clientY, innerHeight - r.height - 8)) + 'px';
});
['click', 'scroll', 'resize'].forEach(t => addEventListener(t, closeCardMenu, true));
addEventListener('keydown', e => { if (e.key === 'Escape') closeCardMenu(); });
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
  // rendered twice: inside the hero (desktop) and in its own section (mobile/tablet); CSS shows one at a time
  const targets = ['categoriesGrid', 'heroCategoriesGrid'].map(id => document.getElementById(id)).filter(Boolean);
  if (!targets.length) return;
  // "ידע וקורסים" ממשיכה להתקיים כקטגוריה מלאה (ניווט, פוטר, סינון) - רק
  // קיצור הדרך הזה בדף הבית הוסר.
  const html = categories.filter(c => c.id !== 'courses').map(c => {
    return `
      <a href="products.html?category=${c.id}" class="category-card has-image">
        <h3>${c.name}</h3>
        ${c.image ? `<div class="category-bg" style="background-image:url('${c.image}')"></div>` : `<div class="category-bg category-bg-icon" style="background: linear-gradient(135deg, ${c.color}, ${c.color}bb)"><i class="fas ${c.icon}"></i></div>`}
        <p>${c.desc}</p>
      </a>
    `;
  }).join('');
  targets.forEach(el => { el.innerHTML = html; });
  initTapHints(targets.flatMap(el => [...el.querySelectorAll('.category-card')]));
}

// === Tap hint ("לחץ לכניסה") - vanilla port of purchasing_groups TapHint.svelte ===
// One hint per page load: fires after scrolling settles, on the first card whose
// centre sits in the middle of the screen. Phone shows a real hand tapping the
// card, laptop shows a mouse cursor clicking. Skipped for prefers-reduced-motion
// unless ?hand=1 is in the URL (test mode: repeats on every card you stop on).
function initTapHints(cards) {
  if (!cards.length) return;
  const forced = new URLSearchParams(location.search).has('hand');
  if (!forced && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const label = 'לחץ לכניסה';
  const mq = window.matchMedia('(min-width: 769px)');
  const cursorSvg = '<span class="tap-cursor"><svg viewBox="0 0 24 24" width="34" height="34"><path d="M4.5 3.2 L4.5 19.6 L8.9 15.6 L11.6 21.4 L14.6 20 L11.9 14.4 L18 14.2 Z" fill="#ffffff" stroke="#0b1220" stroke-width="1.3" stroke-linejoin="round"/></svg></span>';
  const handImg = '<img class="tap-hand" src="images/finger.webp" alt="" width="500" height="802" decoding="async">';
  const hints = cards.map(card => {
    const h = document.createElement('div');
    h.className = 'tap-hint';
    h.setAttribute('aria-hidden', 'true');
    card.appendChild(h);
    return h;
  });
  let shown = false, playing = false, settleTimer;
  const vh = () => window.innerHeight || document.documentElement.clientHeight;
  // render the pieces (transparent) while the card is within a screen of the viewport,
  // so the hand image is downloaded and decoded before the animation starts
  function arm(h) {
    if (h.dataset.armed) return;
    h.dataset.armed = '1';
    const desktop = mq.matches;
    h.classList.toggle('desktop', desktop);
    h.innerHTML = '<span class="tap-ring"></span>' + (desktop ? cursorSvg : handImg) + '<span class="tap-label">' + label + '</span>';
  }
  function prime() {
    const v = vh();
    hints.forEach(h => {
      const r = h.getBoundingClientRect();
      if (r.height && r.top < v * 2 && r.bottom > -v) arm(h);
    });
  }
  function fire() {
    if (playing || (!forced && shown)) return stop();
    const v = vh();
    const h = hints.find(x => {
      const r = x.getBoundingClientRect();
      if (!r.height) return false; // hidden copy of the grid
      const c = r.top + r.height / 2;
      return c >= v * 0.3 && c <= v * 0.72;
    });
    if (!h) return;
    if (!forced) { shown = true; stop(); }
    arm(h);
    playing = true;
    setTimeout(() => {
      h.classList.add('play');
      // 4.2s - the hand leaves after 3, the label lingers another second
      setTimeout(() => { h.classList.remove('play'); playing = false; }, 4200);
    }, 50);
  }
  function onScroll() {
    if (!forced && shown) return stop();
    prime();
    clearTimeout(settleTimer);
    settleTimer = setTimeout(fire, 160);
  }
  function stop() {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    clearTimeout(settleTimer);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  prime();
  settleTimer = setTimeout(fire, 700);
}

// === Quick View ===
function openQuickView(productId) {
  const p = products.find(x => x.id === productId);
  if (!p) return;
  const cat = categories.find(c => c.id === p.category) || categories[0];
  const modal = document.getElementById('quickViewModal');
  const content = document.getElementById('quickViewContent');
  const imgs = productImages(p);
  qvGallery = { id: p.id, imgs, index: 0 };
  content.innerHTML = `
    <button class="modal-close" onclick="closeQuickView()"><i class="fas fa-times"></i></button>
    ${adminGearHtml(p)}
    <div class="quick-view">
      <div class="quick-view-media">
        <div class="quick-view-image${imgs.length ? ' has-photo' : ''}" id="qvMain" style="background: linear-gradient(135deg, ${cat.color}22, ${cat.color}11)" ${imgs.length ? `onclick="openLightbox(${p.id}, qvGallery.index)" title="לחצו להגדלה"` : ''}>
          ${imgs.length ? `<img id="qvMainImg" src="${imgs[0]}" alt="${p.name}">` : `<span>${p.emoji || '📦'}</span>`}
          ${imgs.length ? '<span class="qv-zoom-hint"><i class="fas fa-magnifying-glass-plus"></i></span>' : ''}
          ${imgs.length > 1 ? `
          <button type="button" class="qv-nav qv-prev" onclick="event.stopPropagation();qvStep(-1)" aria-label="תמונה קודמת"><i class="fas fa-chevron-right"></i></button>
          <button type="button" class="qv-nav qv-next" onclick="event.stopPropagation();qvStep(1)" aria-label="תמונה הבאה"><i class="fas fa-chevron-left"></i></button>
          <span class="qv-counter" id="qvCounter">1 / ${imgs.length}</span>` : ''}
        </div>
        ${imgs.length > 1 ? `<div class="qv-thumbs" id="qvThumbs">${imgs.map((src, i) => `<button type="button" class="${i === 0 ? 'active' : ''}" onclick="qvShow(${i})" aria-label="תמונה ${i + 1}"><img src="${src}" alt=""></button>`).join('')}</div>` : ''}
      </div>
      <div class="quick-view-info">
        <span class="product-category" style="color:${cat.color}">${cat.name}</span>
        <h2>${p.name}</h2>
        <div class="product-rating qv-rating" data-rating-for="${p.id}" data-long="1" onclick="document.getElementById('qvComments')?.scrollIntoView({behavior:'smooth'})" title="לדירוגים ולתגובות">${ratingInner(p.id, true)}</div>
        ${p.seller
          ? `<p style="color:var(--text-muted);margin:16px 0">${p.desc || ''}</p>
        <div class="seller-note">
          ${storeLogoHtml(p, 48)}
          <div>נמכר ומסופק על ידי <a href="store.html?s=${encodeURIComponent(p.storeSlug || storeSlug(p.seller))}"><strong>${p.seller}</strong></a>${p.storeCity ? ` · ${p.storeCity}` : ''}${p.deliveryDays ? ` · אספקה תוך ${p.deliveryDays} ימי עסקים` : ''}${p.deliveryByCarrier ? (p.deliveryDays ? ' (בכפוף לחברת המשלוחים)' : ' · זמן אספקה בכפוף לחברת המשלוחים') : ''}${p.shippingPrice != null ? (p.shippingPrice > 0 ? ` · משלוח ₪${p.shippingPrice}` : ' · משלוח חינם') : ''}${p.quantity ? ` · ${p.quantity} יח' במלאי` : ''}
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
        ${shareBarHtml(p)}
        <div style="margin-top:24px;padding-top:24px;border-top:1px solid var(--border);display:grid;gap:8px;font-size:14px;color:var(--text-muted)">
          <div><i class="fas fa-truck" style="color:var(--primary);width:24px"></i> משלוח חינם מעל 199₪</div>
          <div><i class="fas fa-rotate-left" style="color:var(--primary);width:24px"></i> החזרה תוך 30 יום</div>
          <div><i class="fas fa-shield-halved" style="color:var(--primary);width:24px"></i> תשלום מאובטח SSL</div>
        </div>
      </div>
    </div>
    <div id="qvRecs" data-for="${p.id}"></div>
    <div class="quick-view-reviews" id="qvComments" data-for="${p.id}"></div>
  `;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  content.scrollTop = 0;
  attachSwipe(document.getElementById('qvMain'), d => qvStep(d));
  renderRecommendations(p);
  renderComments(p.id);
}

// === גלגל שיניים לסופר-אדמין בחלון המוצר ===
// כמו AdminGemachMenu בגמ"ח הארצי: כפתור ⚙️ קטן עם תפריט נפתח - עריכה במקום,
// הסתרה/החזרה לתצוגה ומחיקה. רק למוצרי מוכרים (יש documentId ב-Strapi);
// השרת (api/seller-products PUT/DELETE) ו-Strapi אוכפים שהמבקש מנהל.
function adminGearHtml(p) {
  if (!currentUser?.superAdmin || !p.documentId) return '';
  const hidden = p.visibility && p.visibility !== 'visible';
  return `
    <div class="admin-gear" id="adminGear">
      <button type="button" class="admin-gear-btn" onclick="event.stopPropagation();toggleAdminGear()" title="ניהול המוצר (אדמין)" aria-label="תפריט ניהול עבור המוצר">⚙️</button>
      <div class="admin-gear-menu" role="menu" hidden>
        <button type="button" role="menuitem" onclick="openAdminEdit(${p.id})">✏️ עריכה</button>
        ${productImages(p).length ? `<button type="button" role="menuitem" onclick="openAdminZoom(${p.id})">🔍 זום / מרכוז לתמונה</button>` : ''}
        ${hidden
          ? `<button type="button" role="menuitem" class="ok" onclick="adminProductAction(${p.id}, 'show')">👁️ החזר לתצוגה</button>`
          : `<button type="button" role="menuitem" class="warn" onclick="adminProductAction(${p.id}, 'hide')">🙈 הסתר מהאתר</button>`}
        <a role="menuitem" href="admin.html#stores">🛡️ לפאנל הניהול</a>
        <hr>
        <button type="button" role="menuitem" class="danger" onclick="adminProductAction(${p.id}, 'delete')">🗑️ מחק</button>
      </div>
    </div>`;
}
function toggleAdminGear(force) {
  const menu = document.querySelector('#adminGear .admin-gear-menu');
  if (menu) menu.hidden = force === undefined ? !menu.hidden : !force;
}
document.addEventListener('click', e => { if (!e.target.closest?.('#adminGear')) toggleAdminGear(false); });

// הטקסט במוצר מגיע מהשרת מנוטרל-HTML (esc) - מפענחים לעריכה ומנטרלים שוב לתצוגה
function htmlDecode(s) { const t = document.createElement('textarea'); t.innerHTML = s ?? ''; return t.value; }
function htmlEsc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function adminPut(payload) {
  const res = await fetch('/api/seller-products', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error && body.error !== 'failed' ? body.error : 'הפעולה נכשלה - נסו שוב');
  return body;
}

async function adminProductAction(id, action) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  toggleAdminGear(false);
  if (action === 'delete' && !confirm(`למחוק את "${htmlDecode(p.name)}"? הפעולה בלתי הפיכה.`)) return;
  try {
    if (action === 'delete') {
      const res = await fetch('/api/seller-products', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: p.documentId })
      });
      if (!res.ok) throw new Error('המחיקה נכשלה - נסו שוב');
    } else {
      await adminPut({ documentId: p.documentId, visibility: action === 'hide' ? 'hidden' : 'visible' });
    }
  } catch (err) { return toast(err.message, 'fa-circle-exclamation'); }
  if (action === 'show') {
    p.visibility = 'visible';
    toast('המוצר חזר לתצוגה');
    return openQuickView(id);
  }
  removeFromShelf(p, action === 'delete' ? 'המוצר נמחק' : 'המוצר הוסתר מהאתר');
}
// מוסתר או נמחק - יורד מהמדף בדף הנוכחי
function removeFromShelf(p, msg) {
  const i = products.indexOf(p);
  if (i >= 0) products.splice(i, 1);
  closeQuickView();
  document.dispatchEvent(new CustomEvent('productsUpdated', { detail: { removed: 1 } }));
  toast(msg);
}

function openAdminEdit(id) {
  const p = products.find(x => x.id === id);
  const info = document.querySelector('#quickViewContent .quick-view-info');
  if (!p || !info) return;
  toggleAdminGear(false);
  const v = k => htmlEsc(htmlDecode(p[k] ?? ''));
  info.innerHTML = `
    <form class="admin-edit-form" onsubmit="event.preventDefault();saveAdminEdit(${p.id}, this)">
      <h3><span>⚙️</span> עריכת המוצר <small>(סופר-אדמין)</small></h3>
      <label>שם המוצר<input name="name" required maxlength="120" value="${v('name')}"></label>
      <div class="row">
        <label>קטגוריה<select name="category">${categories.map(c => `<option value="${c.id}"${c.id === p.category ? ' selected' : ''}>${c.name}</option>`).join('')}</select></label>
        <label>אימוג'י<input name="emoji" maxlength="8" value="${v('emoji')}"></label>
      </div>
      <div class="row">
        <label>מחיר ₪<input name="price" type="number" min="0.01" step="0.01" required value="${p.price ?? ''}"></label>
        <label>מחיר קודם ₪<input name="old_price" type="number" min="0" step="0.01" value="${p.oldPrice ?? ''}"></label>
      </div>
      <div class="row">
        <label>מלאי (ריק = ללא הגבלה)<input name="quantity" type="number" min="0" step="1" value="${p.quantity ?? ''}"></label>
        <label>ימי אספקה<input name="delivery_days" type="number" min="1" step="1" value="${p.deliveryDays ?? ''}"></label>
      </div>
      <label class="inline-check"><input type="checkbox" name="delivery_by_carrier" value="true"${p.deliveryByCarrier ? ' checked' : ''}> אספקה בכפוף לחברת המשלוחים</label>
      <label>תיאור<textarea name="description" rows="8" maxlength="2000">${v('desc')}</textarea></label>
      <label>קישור חיצוני<input name="link" type="url" maxlength="300" placeholder="https://" value="${v('link')}"></label>
      <label>תצוגה<select name="visibility">
        <option value="visible"${(p.visibility || 'visible') === 'visible' ? ' selected' : ''}>מופיע באתר</option>
        <option value="hidden"${p.visibility === 'hidden' ? ' selected' : ''}>לא מופיע</option>
        <option value="neighborhoods"${p.visibility === 'neighborhoods' ? ' selected' : ''}>בשכונות בלבד</option>
      </select></label>
      <div class="actions">
        <button type="submit" class="btn btn-primary"><i class="fas fa-floppy-disk"></i> שמירה</button>
        <button type="button" class="btn btn-ghost" onclick="openQuickView(${p.id})">ביטול</button>
      </div>
    </form>`;
  info.querySelector('input[name="name"]').focus();
}

async function saveAdminEdit(id, form) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const f = Object.fromEntries(new FormData(form));
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await adminPut({ documentId: p.documentId, ...f, delivery_by_carrier: f.delivery_by_carrier === 'true' });
  } catch (err) {
    btn.disabled = false;
    return toast(err.message, 'fa-circle-exclamation');
  }
  const num = s => (s === '' ? null : Number(s));
  Object.assign(p, {
    name: htmlEsc(f.name.trim()), category: f.category, emoji: htmlEsc(f.emoji.trim() || '📦'),
    price: Number(f.price), oldPrice: num(f.old_price) || null, quantity: num(f.quantity) || null,
    deliveryDays: num(f.delivery_days) || null, deliveryByCarrier: f.delivery_by_carrier === 'true', desc: htmlEsc(f.description.trim()),
    link: htmlEsc(f.link.trim()), visibility: f.visibility
  });
  if (f.visibility !== 'visible') return removeFromShelf(p, 'המוצר עודכן והוסתר מהמדף');
  toast('המוצר עודכן');
  document.dispatchEvent(new CustomEvent('productsUpdated', { detail: { edited: 1 } }));
  openQuickView(id);
}

// === זום / מרכוז לתמונה של מוצר קיים (סופר-אדמין) ===
// התמונה השמורה כבר חתוכה ל-4:3; כאן אפשר רק להגדיל ולהזיז בתוכה (למשל להעלים
// כותרת שנחתכה חלקית בשוליים) - התוצאה נשמרת במקום התמונה שמוצגת כעת בגלריה.
const az = { id: 0, index: 0, img: null, scale: 1, x: 0, y: 0, drag: null };
function azEnsureModal() {
  if (document.getElementById('azModal')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal crop-modal" id="azModal">
      <div class="modal-overlay" onclick="closeAdminZoom()"></div>
      <div class="modal-content">
        <button type="button" class="modal-close" onclick="closeAdminZoom()"><i class="fas fa-times"></i></button>
        <h3><i class="fas fa-crop-simple"></i> זום / מרכוז לתמונה</h3>
        <p class="hint">גררו כדי למרכז, גלגלת או הסליידר כדי לזום. מה שבתוך המסגרת - זה מה שיוצג באתר.</p>
        <div class="crop-stage" id="azStage"><canvas id="azCanvas" width="1200" height="900"></canvas></div>
        <div class="crop-toolbar">
          <div class="zoom">
            <i class="fas fa-magnifying-glass-minus"></i>
            <input type="range" id="azZoom" min="100" max="300" value="100" oninput="azZoomTo(this.value / 100)">
            <i class="fas fa-magnifying-glass-plus"></i>
          </div>
          <div class="tools"><button type="button" onclick="az.x = 0; az.y = 0; azDraw()"><i class="fas fa-crosshairs"></i> מרכוז</button></div>
        </div>
        <div class="crop-actions">
          <button type="button" class="btn btn-ghost" onclick="closeAdminZoom()">ביטול</button>
          <button type="button" class="btn btn-primary" id="azSave" onclick="saveAdminZoom()"><i class="fas fa-check"></i> שמירה</button>
        </div>
      </div>
    </div>`);
  const stage = document.getElementById('azStage');
  const pt = e => { const r = stage.getBoundingClientRect(); return { x: (e.clientX - r.left) * 1200 / r.width, y: (e.clientY - r.top) * 900 / r.height }; };
  stage.addEventListener('pointerdown', e => { stage.setPointerCapture(e.pointerId); const p = pt(e); az.drag = { px: p.x, py: p.y, x: az.x, y: az.y }; });
  stage.addEventListener('pointermove', e => { if (!az.drag) return; const p = pt(e); az.x = az.drag.x + p.x - az.drag.px; az.y = az.drag.y + p.y - az.drag.py; azDraw(); });
  ['pointerup', 'pointercancel'].forEach(ev => stage.addEventListener(ev, () => { az.drag = null; }));
  stage.addEventListener('wheel', e => { e.preventDefault(); azZoomTo(az.scale * (e.deltaY < 0 ? 1.08 : 1 / 1.08)); }, { passive: false });
}
// scale יחסית ל"מילוי" (1 = התמונה כפי שהיא); x/y = הסטת המרכז בפיקסלים של הקנבס
function azDraw() {
  const c = document.getElementById('azCanvas'), img = az.img;
  const base = Math.max(1200 / img.width, 900 / img.height), s = base * az.scale;
  const maxX = (img.width * s - 1200) / 2, maxY = (img.height * s - 900) / 2;
  az.x = Math.min(maxX, Math.max(-maxX, az.x));
  az.y = Math.min(maxY, Math.max(-maxY, az.y));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1200, 900);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 600 + az.x - img.width * s / 2, 450 + az.y - img.height * s / 2, img.width * s, img.height * s);
  document.getElementById('azZoom').value = Math.round(az.scale * 100);
}
function azZoomTo(scale) {
  const s2 = Math.min(3, Math.max(1, Number(scale)));
  az.x *= s2 / az.scale; az.y *= s2 / az.scale;
  az.scale = s2;
  azDraw();
}
function openAdminZoom(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  toggleAdminGear(false);
  const index = qvGallery.id === id ? qvGallery.index : 0;
  const src = productImages(p)[index];
  if (!src) return;
  const img = new Image();
  img.onload = () => {
    Object.assign(az, { id, index, img, scale: 1, x: 0, y: 0, drag: null });
    azEnsureModal();
    document.getElementById('azModal').classList.add('active');
    azDraw();
  };
  img.onerror = () => toast('טעינת התמונה נכשלה', 'fa-circle-exclamation');
  img.src = src;
}
function closeAdminZoom() { document.getElementById('azModal')?.classList.remove('active'); }
async function saveAdminZoom() {
  const p = products.find(x => x.id === az.id);
  if (!p) return;
  const btn = document.getElementById('azSave');
  btn.disabled = true;
  const data = document.getElementById('azCanvas').toDataURL('image/jpeg', 0.88);
  try {
    await adminPut({ documentId: p.documentId, replace_image: { index: az.index, data } });
  } catch (err) {
    btn.disabled = false;
    return toast(err.message, 'fa-circle-exclamation');
  }
  btn.disabled = false;
  // מציגים מיד את הגרסה החדשה; בטעינה הבאה השרת כבר מחזיר כתובת עם גרסה חדשה
  const imgs = productImages(p).slice();
  imgs[az.index] = data;
  p.images = imgs;
  p.image = imgs[0];
  closeAdminZoom();
  toast('התמונה עודכנה');
  document.dispatchEvent(new CustomEvent('productsUpdated', { detail: { edited: 1 } }));
  openQuickView(az.id);
}

// === גלריית המוצר בחלון המהיר ===
// מוצר מוכר נושא images (עד 6, הראשונה ראשית); מוצר עם image בלבד = גלריה של אחת.
let qvGallery = { id: 0, imgs: [], index: 0 };
function productImages(p) {
  const list = Array.isArray(p.images) && p.images.length ? p.images : (p.image ? [p.image] : []);
  return list.filter(Boolean);
}
function qvShow(i) {
  const g = qvGallery;
  if (!g.imgs.length) return;
  g.index = (i + g.imgs.length) % g.imgs.length;
  const img = document.getElementById('qvMainImg');
  if (img) img.src = g.imgs[g.index];
  const counter = document.getElementById('qvCounter');
  if (counter) counter.textContent = `${g.index + 1} / ${g.imgs.length}`;
  document.querySelectorAll('#qvThumbs button').forEach((b, k) => b.classList.toggle('active', k === g.index));
}
function qvStep(d) { qvShow(qvGallery.index + d); }
// החלקה אופקית (מגע) - מעבר בין תמונות. RTL: החלקה שמאלה = הבאה.
function attachSwipe(el, onSwipe) {
  if (!el) return;
  let x0 = null, y0 = null;
  el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchend', e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 1 : -1);
  }, { passive: true });
}

// === שיתוף מוצר ===
// הקישור המשותף הוא /p/<id> - דף שמגיש לרובוטים של וואטסאפ/פייסבוק/טלגרם/X את
// השם, התיאור והתמונה הראשית (Open Graph), ומעביר גולש אמיתי לחלון המוצר.
function productShareUrl(id) { return `${location.origin}/p/${id}`; }
function productShareText(p) { return `${p.name} - ₪${p.price}${p.seller ? ` · ${p.seller}` : ''} | חנות החירות`; }
function shareBarHtml(p) {
  const url = productShareUrl(p.id);
  const text = productShareText(p);
  const u = encodeURIComponent(url), t = encodeURIComponent(text);
  return `
    <div class="share-bar">
      <span class="share-label"><i class="fas fa-share-nodes"></i> שיתוף</span>
      ${navigator.share ? `<button type="button" onclick="shareProduct(${p.id})" title="שיתוף..."><i class="fas fa-arrow-up-from-bracket"></i></button>` : ''}
      <a href="https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}" target="_blank" rel="noopener" class="wa" title="וואטסאפ"><i class="fab fa-whatsapp"></i></a>
      <a href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener" class="fb" title="פייסבוק"><i class="fab fa-facebook-f"></i></a>
      <a href="https://t.me/share/url?url=${u}&text=${t}" target="_blank" rel="noopener" class="tg" title="טלגרם"><i class="fab fa-telegram"></i></a>
      <a href="https://twitter.com/intent/tweet?url=${u}&text=${t}" target="_blank" rel="noopener" class="x" title="X"><i class="fab fa-x-twitter"></i></a>
      <a href="mailto:?subject=${t}&body=${encodeURIComponent(text + '\n' + url)}" title="אימייל"><i class="fas fa-envelope"></i></a>
      <button type="button" onclick="copyProductLink(${p.id})" title="העתקת קישור"><i class="fas fa-link"></i></button>
    </div>`;
}
async function copyProductLink(id) {
  const url = productShareUrl(id);
  try { await navigator.clipboard.writeText(url); toast('הקישור הועתק', 'fa-link'); }
  catch { prompt('העתיקו את הקישור:', url); }
}
// שיתוף מקורי (מובייל): כותרת + טקסט + קישור, ואם המכשיר תומך - גם קובץ התמונה
// הראשית, כך שבוואטסאפ למשל נשלחת התמונה עצמה ולא רק תצוגה מקדימה.
async function shareProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const data = { title: p.name, text: productShareText(p), url: productShareUrl(id) };
  try {
    const cover = productImages(p)[0];
    if (cover && navigator.canShare) {
      const blob = await (await fetch(cover)).blob();
      const file = new File([blob], `product-${id}.${blob.type.includes('png') ? 'png' : 'jpg'}`, { type: blob.type });
      if (navigator.canShare({ files: [file] })) { data.files = [file]; data.text += '\n' + data.url; }
    }
  } catch { /* בלי קובץ */ }
  try { await navigator.share(data); }
  catch (ex) { if (ex?.name !== 'AbortError') copyProductLink(id); }
}

// === לייטבוקס: תצוגה מלאה עם זום (גלגלת / צביטה / הקשה כפולה), גרירה והחלקה ===
const lb = { imgs: [], index: 0, scale: 1, x: 0, y: 0, pointers: new Map(), pinch: null, drag: null, base: { w: 0, h: 0 } };
function ensureLightbox() {
  let el = document.getElementById('lightbox');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'lightbox';
  el.className = 'lightbox';
  el.innerHTML = `
    <button type="button" class="lb-close" onclick="closeLightbox()" aria-label="סגירה"><i class="fas fa-times"></i></button>
    <span class="lb-counter" id="lbCounter"></span>
    <button type="button" class="lb-nav lb-prev" onclick="lbStep(-1)" aria-label="קודמת"><i class="fas fa-chevron-right"></i></button>
    <button type="button" class="lb-nav lb-next" onclick="lbStep(1)" aria-label="הבאה"><i class="fas fa-chevron-left"></i></button>
    <div class="lb-stage" id="lbStage"><img id="lbImg" alt="" draggable="false"></div>
    <div class="lb-tools">
      <button type="button" onclick="lbZoomBy(1/1.5)" aria-label="הקטנה"><i class="fas fa-minus"></i></button>
      <span id="lbZoomLabel">100%</span>
      <button type="button" onclick="lbZoomBy(1.5)" aria-label="הגדלה"><i class="fas fa-plus"></i></button>
      <button type="button" onclick="lbReset()" aria-label="איפוס"><i class="fas fa-compress"></i></button>
    </div>`;
  document.body.appendChild(el);
  const stage = el.querySelector('#lbStage');
  const img = el.querySelector('#lbImg');
  img.addEventListener('load', () => { lb.base = { w: img.clientWidth, h: img.clientHeight }; lbApply(); });
  stage.addEventListener('click', e => { if (e.target === stage) closeLightbox(); });
  stage.addEventListener('wheel', e => {
    e.preventDefault();
    lbZoomAt(lb.scale * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX, e.clientY);
  }, { passive: false });
  let lastTap = 0;
  stage.addEventListener('pointerdown', e => {
    stage.setPointerCapture(e.pointerId);
    lb.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (lb.pointers.size === 2) {
      const [a, b] = [...lb.pointers.values()];
      lb.pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale: lb.scale };
      lb.drag = null;
    } else {
      lb.drag = { x: e.clientX, y: e.clientY, tx: lb.x, ty: lb.y, moved: false, t: Date.now() };
    }
  });
  stage.addEventListener('pointermove', e => {
    if (!lb.pointers.has(e.pointerId)) return;
    lb.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (lb.pinch && lb.pointers.size === 2) {
      const [a, b] = [...lb.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      lbZoomAt(lb.pinch.scale * (dist / lb.pinch.dist), (a.x + b.x) / 2, (a.y + b.y) / 2, true);
    } else if (lb.drag) {
      const dx = e.clientX - lb.drag.x, dy = e.clientY - lb.drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) lb.drag.moved = true;
      if (lb.scale > 1) { lb.x = lb.drag.tx + dx; lb.y = lb.drag.ty + dy; lbApply(); }
    }
  });
  const up = e => {
    lb.pointers.delete(e.pointerId);
    if (lb.pointers.size < 2) lb.pinch = null;
    if (lb.drag && lb.pointers.size === 0) {
      const dx = e.clientX - lb.drag.x, dy = e.clientY - lb.drag.y;
      if (lb.scale === 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) lbStep(dx < 0 ? 1 : -1);
      else if (!lb.drag.moved && e.target === img) {
        const now = Date.now();
        if (now - lastTap < 320) { lastTap = 0; lb.scale > 1 ? lbReset() : lbZoomAt(2.5, e.clientX, e.clientY); }
        else lastTap = now;
      }
      lb.drag = null;
    }
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  return el;
}
function openLightbox(productId, index = 0) {
  const p = products.find(x => x.id === productId);
  const imgs = p ? productImages(p) : [];
  if (!imgs.length) return;
  const el = ensureLightbox();
  lb.imgs = imgs;
  el.classList.toggle('single', imgs.length < 2);
  el.classList.add('active');
  lbShow(index);
}
function lbShow(i) {
  lb.index = (i + lb.imgs.length) % lb.imgs.length;
  lb.scale = 1; lb.x = 0; lb.y = 0;
  const img = document.getElementById('lbImg');
  img.src = lb.imgs[lb.index];
  document.getElementById('lbCounter').textContent = `${lb.index + 1} / ${lb.imgs.length}`;
  lbApply();
}
function lbStep(d) { if (lb.imgs.length > 1) lbShow(lb.index + d); }
function lbReset() { lb.scale = 1; lb.x = 0; lb.y = 0; lbApply(); }
function lbZoomBy(f) { lbZoomAt(lb.scale * f, innerWidth / 2, innerHeight / 2); }
// זום סביב נקודה על המסך: הנקודה שמתחת לאצבע/סמן נשארת במקום
function lbZoomAt(scale, cx, cy, silent = false) {
  const s1 = lb.scale, s2 = Math.min(6, Math.max(1, scale));
  const px = cx - innerWidth / 2, py = cy - innerHeight / 2;
  lb.x = px - (px - lb.x) * (s2 / s1);
  lb.y = py - (py - lb.y) * (s2 / s1);
  lb.scale = s2;
  lbApply(silent);
}
function lbApply(silent = false) {
  const img = document.getElementById('lbImg');
  if (!img) return;
  const maxX = Math.max(0, (lb.base.w * lb.scale - innerWidth) / 2 + 24);
  const maxY = Math.max(0, (lb.base.h * lb.scale - innerHeight) / 2 + 24);
  lb.x = Math.min(maxX, Math.max(-maxX, lb.x));
  lb.y = Math.min(maxY, Math.max(-maxY, lb.y));
  img.style.transition = silent ? 'none' : '';
  img.style.transform = `translate(${lb.x}px, ${lb.y}px) scale(${lb.scale})`;
  img.style.cursor = lb.scale > 1 ? 'grab' : 'zoom-in';
  const label = document.getElementById('lbZoomLabel');
  if (label) label.textContent = `${Math.round(lb.scale * 100)}%`;
}
function closeLightbox() {
  document.getElementById('lightbox')?.classList.remove('active');
}
function lightboxOpen() { return document.getElementById('lightbox')?.classList.contains('active'); }

// === המלצות בחלון המוצר ===
// 1. "עוד מהחנות של X" - מוצרים נוספים של אותו מוכר (למוצר קבוע: מאותה קטגוריה).
// 2. "לקוחות שהתעניינו במוצר זה רכשו גם" - מההזמנות האמיתיות (ספירות אנונימיות של
//    מוצרים שנרכשו יחד, דרך /api/orders?related=). כשאין עדיין נתונים - מוצרים
//    פופולריים מקטגוריות אחרות, בכותרת מתאימה.
const relatedCache = {};
async function renderRecommendations(p) {
  const el = document.getElementById('qvRecs');
  if (!el) return;
  const exclude = new Set([p.id]);
  let more = p.storeSlug ? products.filter(x => x.id !== p.id && x.storeSlug === p.storeSlug) : [];
  let moreTitle = more.length ? `עוד מהחנות של ${p.seller}` : `עוד ב${(categories.find(c => c.id === p.category) || {}).name || 'קטגוריה'}`;
  if (!more.length) more = products.filter(x => x.id !== p.id && x.category === p.category);
  more = more.slice(0, 4);
  more.forEach(x => exclude.add(x.id));

  let bought = [];
  let boughtTitle = 'לקוחות שהתעניינו במוצר זה רכשו גם';
  try {
    if (!(p.id in relatedCache)) {
      const r = await fetch(`/api/orders?related=${p.id}`);
      relatedCache[p.id] = r.ok ? ((await r.json()).related?.[p.id] || []) : [];
    }
    bought = relatedCache[p.id].map(x => products.find(q => q.id === x.id)).filter(q => q && !exclude.has(q.id)).slice(0, 4);
  } catch { /* offline / dev ללא API */ }
  if (!bought.length) {
    boughtTitle = 'לקוחות שהתעניינו במוצר זה התעניינו גם ב';
    bought = products.filter(x => !exclude.has(x.id) && x.category !== p.category)
      .sort((a, b) => (b.reviews || 0) - (a.reviews || 0)).slice(0, 4);
  }
  // בינתיים נפתח מוצר אחר? לא דורסים
  if (el.dataset.for !== String(p.id)) return;
  const block = (icon, title, list) => list.length
    ? `<div class="qv-recs"><h3><i class="fas ${icon}"></i> ${title}</h3><div class="products-grid">${list.map(productCard).join('')}</div></div>`
    : '';
  el.innerHTML = block('fa-store', moreTitle, more) + block('fa-bag-shopping', boughtTitle, bought);
}
// === דירוגים ותגובות על מוצר ===
// אותו מודל כמו דירוגי שביעות הרצון בקבוצות הרכישה (RatingForm + דף התגובות שם):
// דירוג 1-5 כוכבים עם אימוג'י + תגובה, לייק ותגובה-לתגובה לכל מחובר, ונעיצה /
// "אהוב על המנהל" / תשובת מנהל למנהל. הטופס גלוי לכולם; אורח שלוחץ על דירוג או
// שליחה מקבל הודעת הרשמה. השם והתמונה של הכותב נקבעים בשרת לפי המשתמש המחובר;
// דירוג אחד למשתמש למוצר (דירוג חוזר מעדכן). ההרשאות נאכפות ב-Strapi.
const RV_LEVELS = {
  1: { face: '😞', text: 'מאוד לא מרוצה' },
  2: { face: '😐', text: 'לא מרוצה' },
  3: { face: '🙂', text: 'סביר' },
  4: { face: '😊', text: 'מרוצה' },
  5: { face: '🤩', text: 'מאוד מרוצה!' },
};
const RV_EMPTY = '<div class="comment-empty">עדיין אין דירוגים. היו הראשונים לדרג את המוצר!</div>';
let rv = { id: null, items: [], isAdmin: false, rating: 0, draft: '', replyOpen: {}, replyDraft: {}, busy: {}, thanks: false };

// --- דירוג ממוצע לכל המוצרים (כרטיסים + חלון המוצר) ---
let ratingSummary = {};
function starsMeter(avg) {
  return `<span class="stars-meter" style="--r:${Math.max(0, Math.min(5, avg))}" aria-hidden="true"><span>★★★★★</span></span>`;
}
function ratingInner(id, long = false) {
  const s = ratingSummary[id];
  if (!s || !s[1]) return '';
  return `${starsMeter(s[0])}<span>${s[0].toFixed(1)} (${long ? (s[1] === 1 ? 'דירוג אחד' : s[1] + ' דירוגים') : s[1]})</span>`;
}
function paintRatings() {
  document.querySelectorAll('[data-rating-for]').forEach(el => {
    el.innerHTML = ratingInner(Number(el.dataset.ratingFor), el.dataset.long === '1');
  });
}
async function loadRatingSummary() {
  try {
    const r = await fetch('/api/comments?summary=1');
    if (r.ok) ratingSummary = (await r.json()).ratings || {};
  } catch { /* offline / dev ללא API */ }
  paintRatings();
}

function commentTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return 'עכשיו';
  if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דק'`;
  if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שע'`;
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });
}
function rvAvatar(name, url) {
  const initial = htmlEsc((name || '?').charAt(0));
  return url && /^https:\/\//.test(url)
    ? `<img src="${htmlEsc(url)}" alt="" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${initial}'}))">`
    : `<span>${initial}</span>`;
}
function rvItemHtml(c) {
  const id = htmlEsc(c.documentId);
  const replies = c.replies || [];
  const open = rv.replyOpen[c.documentId];
  return `<div class="comment${c.is_featured ? ' featured' : ''}" data-id="${id}">
    <div class="comment-avatar">${rvAvatar(c.author_name, c.author_avatar)}</div>
    <div class="comment-main">
      <div class="comment-head">
        <strong>${htmlEsc(c.author_name || 'משתמש')}</strong>
        ${c.rating ? `<span class="rv-item-stars" title="${c.rating} מתוך 5">${'★'.repeat(c.rating)}<i>${'★'.repeat(5 - c.rating)}</i></span>` : ''}
        ${c.is_featured ? '<span title="תגובה מובילה">📌</span>' : ''}
        ${c.admin_liked ? '<span title="אהוב על המנהל">❤️</span>' : ''}
        <span class="comment-date">${commentTime(c.createdAt)}</span>
      </div>
      ${c.body ? `<p>${htmlEsc(c.body)}</p>` : ''}
      ${c.admin_reply ? `<div class="rv-admin-reply"><span>תגובת המנהל:</span><p>${htmlEsc(c.admin_reply)}</p></div>` : ''}
      <div class="rv-actions">
        <button type="button" class="rv-act${c.liked ? ' liked' : ''}" onclick="rvLike('${id}')" ${rv.busy['like' + c.documentId] ? 'disabled' : ''} aria-pressed="${!!c.liked}" title="${c.liked ? 'בטל לייק' : 'אהבתי'}">${c.liked ? '❤️' : '🤍'} אהבתי${c.likes ? ` <b>${c.likes}</b>` : ''}</button>
        <button type="button" class="rv-act" onclick="rvToggleReply('${id}')" title="הגב לתגובה">💬 הגב${replies.length ? ` (${replies.length})` : ''}</button>
        ${c.canDelete ? `<button type="button" class="rv-act rv-del" onclick="deleteComment('${id}')" title="מחיקה"><i class="fas fa-trash-can"></i></button>` : ''}
      </div>
      ${rv.isAdmin ? `<div class="rv-admin-row">
        <button type="button" onclick="rvAdmin('${id}','is_featured')">📌 ${c.is_featured ? 'בטל נעיצה' : 'נעץ'}</button>
        <button type="button" onclick="rvAdmin('${id}','admin_liked')">${c.admin_liked ? '💔 בטל אהוב' : '❤️ אהוב על המנהל'}</button>
        <button type="button" onclick="rvAdminReply('${id}')">✍️ ${c.admin_reply ? 'ערוך תשובת מנהל' : 'תשובת מנהל'}</button>
      </div>` : ''}
      ${replies.length ? `<div class="rv-replies">${replies.map(r => `<div class="rv-reply${r.is_admin ? ' admin' : ''}">
        <div class="rv-reply-meta"><strong>${htmlEsc(r.user_name || 'משתמש')}</strong>${r.is_admin ? '<span class="rv-admin-tag">מנהל</span>' : ''}<span>${commentTime(r.created_at)}</span></div>
        <p>${htmlEsc(r.text)}</p></div>`).join('')}</div>` : ''}
      ${open ? `<div class="rv-reply-box">
        <textarea rows="2" maxlength="1000" placeholder="כתוב תגובה…" oninput="rv.replyDraft['${id}']=this.value">${htmlEsc(rv.replyDraft[c.documentId] || '')}</textarea>
        <button type="button" class="btn btn-primary btn-sm" onclick="rvSendReply('${id}')" ${rv.busy['reply' + c.documentId] ? 'disabled' : ''}>${rv.busy['reply' + c.documentId] ? 'שולח…' : 'שלח תגובה'}</button>
      </div>` : ''}
    </div>
  </div>`;
}
function rvFormHtml() {
  if (rv.thanks) {
    return `<div class="rv-thanks"><div>✨</div><h4>תודה על הדירוג!</h4><p>המשוב שלך עוזר לקונים אחרים.</p>
      <button type="button" class="rv-link" onclick="rv.thanks=false;rvDraw()">עדכון הדירוג</button></div>`;
  }
  const mine = rv.items.find(c => c.mine);
  const lvl = RV_LEVELS[rv.rating];
  return `<div class="rv-form">
    <div class="rv-rate">
      <span class="rv-label">דרג:</span>
      <div class="rv-stars">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="${n <= rv.rating ? 'filled' : ''}" onclick="rvRate(${n})" aria-label="דירוג ${n} מתוך 5">★</button>`).join('')}</div>
      ${lvl ? `<div class="rv-emoji"><span>${lvl.face}</span><b>${lvl.text}</b></div>` : ''}
    </div>
    ${mine ? '<p class="rv-note">כבר דירגת את המוצר - אפשר לעדכן את הדירוג והתגובה</p>' : ''}
    <label class="rv-label-sm" for="rvBody">הערות על המוצר:</label>
    <div class="rv-body-row">
      <textarea id="rvBody" rows="3" maxlength="1000" placeholder="איכות המוצר, התאמה לתיאור ולתמונות, זמן האספקה, השירות של המוכר וכו'" oninput="rv.draft=this.value">${htmlEsc(rv.draft)}</textarea>
      <button type="button" class="btn btn-primary" onclick="rvSubmit()" ${currentUser && !rv.rating ? 'disabled' : ''} ${rv.busy.submit ? 'disabled' : ''}>${rv.busy.submit ? 'שולח…' : mine ? 'עדכון הדירוג' : 'שלח דירוג ותגובה'}</button>
    </div>
    <div class="rv-register" id="rvRegister" hidden>
      <span>🔒</span>
      <p>הדירוג והדעה שלך חשובים לנו, אנא הירשם תחילה על מנת לוודא שבוטים לא מעורבים בדירוגים ובתגובות</p>
      <button type="button" class="btn btn-primary" onclick="openAuth('login')">הרשמה / התחברות</button>
    </div>
  </div>`;
}
function rvDraw() {
  const el = document.getElementById('qvComments');
  if (!el || el.dataset.for !== String(rv.id)) return;
  const s = ratingSummary[rv.id];
  el.innerHTML = `
    <div class="rv-head">
      <h3><i class="fas fa-star"></i> דירוגים ותגובות</h3>
      ${s && s[1] ? `<div class="rv-badge">${starsMeter(s[0])}<b>${s[0].toFixed(1)}/5</b><span>(${s[1]})</span></div>` : ''}
    </div>
    ${rvFormHtml()}
    <div class="comment-list">${rv.loading ? '<div class="comment-empty"><i class="fas fa-spinner fa-spin"></i></div>' : rv.items.length ? rv.items.map(rvItemHtml).join('') : RV_EMPTY}</div>`;
}
function rvRedrawItem(docId) {
  const c = rv.items.find(x => x.documentId === docId);
  const el = document.querySelector(`#qvComments .comment[data-id="${CSS.escape(docId)}"]`);
  if (c && el) el.outerHTML = rvItemHtml(c);
}
function rvNeedLogin() {
  if (currentUser) return false;
  const p = document.getElementById('rvRegister');
  if (p) { p.hidden = false; p.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  return true;
}
async function renderComments(productId) {
  const el = document.getElementById('qvComments');
  if (!el || el.dataset.for !== String(productId)) return;
  const same = rv.id === productId;
  rv = { ...rv, id: productId, loading: true, replyOpen: same ? rv.replyOpen : {}, replyDraft: same ? rv.replyDraft : {}, busy: {}, thanks: same && rv.thanks };
  if (!same) { rv.items = []; rv.rating = 0; rv.draft = ''; rv.isAdmin = false; }
  rvDraw();
  let data = null;
  try {
    const r = await fetch(`/api/comments?product=${productId}`);
    if (r.ok) data = await r.json();
  } catch { /* offline / dev ללא API */ }
  if (rv.id !== productId) return;
  rv.loading = false;
  rv.items = data?.items || [];
  rv.isAdmin = !!data?.isAdmin;
  if (data) {
    ratingSummary[productId] = [data.average || 0, data.count || 0];
    paintRatings();
  }
  // הדירוג הקיים של המשתמש ממלא את הטופס (דירוג חוזר מעדכן)
  const mine = rv.items.find(c => c.mine);
  if (mine && !rv.rating) { rv.rating = mine.rating || 0; rv.draft = mine.body || ''; }
  rvDraw();
}
function rvRate(n) {
  if (rvNeedLogin()) return;
  rv.rating = n;
  rvDraw();
}
async function rvSubmit() {
  if (rvNeedLogin() || !rv.rating || rv.busy.submit) return;
  rv.busy.submit = true;
  rvDraw();
  try {
    const r = await fetch('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: rv.id, rating: rv.rating, body: rv.draft.trim() }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { toast('נדרשת הרשמה כדי לדרג ולהגיב', 'fa-lock'); openAuth('login'); return; }
    if (!r.ok || !j.item) { toast(j.error || 'השליחה נכשלה - נסו שוב בעוד מספר רגעים', 'fa-circle-exclamation'); return; }
    rv.thanks = true;
    rv.busy.submit = false;
    await renderComments(rv.id);
  } catch {
    toast('השליחה נכשלה - נסו שוב בעוד מספר רגעים', 'fa-circle-exclamation');
  } finally {
    rv.busy.submit = false;
    rvDraw();
  }
}
async function rvLike(docId) {
  if (rvNeedLogin()) return;
  const c = rv.items.find(x => x.documentId === docId);
  if (!c || rv.busy['like' + docId]) return;
  const prev = { likes: c.likes, liked: c.liked };
  c.likes += c.liked ? -1 : 1;
  c.liked = !c.liked;
  rv.busy['like' + docId] = true;
  rvRedrawItem(docId);
  try {
    const r = await fetch(`/api/comments?id=${encodeURIComponent(docId)}&action=like`, { method: 'POST' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error);
    c.likes = j.likes;
    c.liked = j.liked;
  } catch {
    Object.assign(c, prev);
    toast('שמירת הלייק נכשלה, נסו שוב', 'fa-circle-exclamation');
  } finally {
    rv.busy['like' + docId] = false;
    rvRedrawItem(docId);
  }
}
function rvToggleReply(docId) {
  if (rvNeedLogin()) return;
  rv.replyOpen[docId] = !rv.replyOpen[docId];
  rvRedrawItem(docId);
  if (rv.replyOpen[docId]) document.querySelector(`#qvComments .comment[data-id="${CSS.escape(docId)}"] .rv-reply-box textarea`)?.focus();
}
async function rvSendReply(docId) {
  if (rvNeedLogin()) return;
  const c = rv.items.find(x => x.documentId === docId);
  const text = (rv.replyDraft[docId] || '').trim();
  if (!c || rv.busy['reply' + docId]) return;
  if (text.length < 2) { toast('כתבו תגובה קודם', 'fa-circle-exclamation'); return; }
  rv.busy['reply' + docId] = true;
  rvRedrawItem(docId);
  try {
    const r = await fetch(`/api/comments?id=${encodeURIComponent(docId)}&action=reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error);
    c.replies = j.replies || c.replies;
    rv.replyDraft[docId] = '';
    rv.replyOpen[docId] = false;
  } catch (e) {
    toast(e.message || 'שליחת התגובה נכשלה, נסו שוב', 'fa-circle-exclamation');
  } finally {
    rv.busy['reply' + docId] = false;
    rvRedrawItem(docId);
  }
}
async function rvAdminUpdate(docId, data) {
  const c = rv.items.find(x => x.documentId === docId);
  try {
    const r = await fetch(`/api/comments?id=${encodeURIComponent(docId)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.item) throw new Error(j.error);
    if (c) Object.assign(c, j.item, { replies: c.replies });
    // נעיצה משנה את הסדר - מציירים את כל הרשימה
    if ('is_featured' in data) {
      rv.items.sort((a, b) => Number(!!b.is_featured) - Number(!!a.is_featured) || Date.parse(b.createdAt) - Date.parse(a.createdAt));
      rvDraw();
    } else rvRedrawItem(docId);
  } catch (e) {
    toast(e.message || 'העדכון נכשל', 'fa-circle-exclamation');
  }
}
function rvAdmin(docId, field) {
  const c = rv.items.find(x => x.documentId === docId);
  if (c) rvAdminUpdate(docId, { [field]: !c[field] });
}
function rvAdminReply(docId) {
  const c = rv.items.find(x => x.documentId === docId);
  if (!c) return;
  const text = prompt('תשובת המנהל (השאירו ריק כדי למחוק):', c.admin_reply || '');
  if (text === null) return;
  rvAdminUpdate(docId, { admin_reply: text.trim() });
}
async function deleteComment(docId) {
  if (!confirm('למחוק את התגובה לצמיתות?')) return;
  try {
    const r = await fetch(`/api/comments?id=${encodeURIComponent(docId)}`, { method: 'DELETE' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { toast(j.error || 'המחיקה נכשלה', 'fa-circle-exclamation'); return; }
    const wasMine = rv.items.find(x => x.documentId === docId)?.mine;
    if (wasMine) { rv.rating = 0; rv.draft = ''; rv.thanks = false; }
    toast('התגובה נמחקה');
    renderComments(rv.id);
  } catch {
    toast('המחיקה נכשלה', 'fa-circle-exclamation');
  }
}
// התחברות/התנתקות בזמן שחלון המוצר פתוח - מרעננים את אזור הדירוגים
document.addEventListener('userChanged', () => {
  const el = document.getElementById('qvComments');
  if (el && document.getElementById('quickViewModal')?.classList.contains('active')) renderComments(Number(el.dataset.for));
});

function closeQuickView() {
  document.getElementById('quickViewModal').classList.remove('active');
  document.body.style.overflow = '';
}

// === Search ===
// כפתור החיפוש ותיבת החיפוש קיימים בכל הדפים (מוזרקים אם חסרים בדף). בתוך
// תיבת החיפוש יש תפריט קישורים מהירים - "חנות" (כל המוצרים), "החנויות בקניון"
// והקטגוריות - שהוצאו מהסרגל הראשי כדי להשאיר אותו נקי.
function ensureSearchUI() {
  const header = document.querySelector('.header');
  const actions = document.querySelector('.header-actions');
  if (!header || !actions) return;
  if (!document.getElementById('searchToggle')) {
    const btn = document.createElement('button');
    btn.id = 'searchToggle';
    btn.className = 'icon-btn';
    btn.setAttribute('aria-label', 'חיפוש');
    btn.innerHTML = '<i class="fas fa-search"></i>';
    actions.insertBefore(btn, actions.firstChild);
  }
  placeSearchToggle();
  if (!document.getElementById('searchBar')) {
    const bar = document.createElement('div');
    bar.id = 'searchBar';
    bar.className = 'search-bar';
    bar.innerHTML = `
      <div class="container">
        <div class="search-input-wrap">
          <i class="fas fa-search"></i>
          <input type="text" id="searchInput" placeholder="חפש מוצרים, קטגוריות, חנויות...">
          <button class="search-close" id="searchClose"><i class="fas fa-times"></i></button>
        </div>
        <div class="search-suggestions" id="searchSuggestions"></div>
      </div>`;
    header.appendChild(bar);
  }
}
function searchQuickLinks() {
  return `
    <div class="search-quick">
      <a href="products.html"><i class="fas fa-shopping-bag"></i> חנות - כל המוצרים</a>
      <a href="stores.html"><i class="fas fa-store"></i> החנויות בקניון</a>
      ${categories.map(c => `<a href="products.html?category=${c.id}"><i class="fas ${c.icon}" style="color:${c.color}"></i> ${c.name}</a>`).join('')}
    </div>`;
}
function initSearch() {
  ensureSearchUI();
  const toggle = document.getElementById('searchToggle');
  const bar = document.getElementById('searchBar');
  const close = document.getElementById('searchClose');
  const input = document.getElementById('searchInput');
  const suggestions = document.getElementById('searchSuggestions');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    bar.classList.toggle('active');
    if (bar.classList.contains('active')) {
      if (!input.value.trim()) suggestions.innerHTML = searchQuickLinks();
      setTimeout(() => input.focus(), 100);
    }
  });
  close?.addEventListener('click', () => bar.classList.remove('active'));

  input?.addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) { suggestions.innerHTML = searchQuickLinks(); return; }
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


// === Auth ===
// שם תצוגה: לעולם לא מזהה-מכונה של ספק ההזדהות (google_1164…) - כמו בשאר האתרים
function displayName(u) {
  const name = String(u?.name || '').trim();
  const machine = /^(google|facebook|apple|community|local)[_-]/i.test(name) || /^[a-z][a-z0-9]*[_-]d{5,}$/i.test(name);
  if (name && !name.includes('@') && !machine) return name;
  const local = String(u?.email || '').split('@')[0];
  return local ? local.split(/[._-]+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'משתמש';
}
// אווטאר: תמונת הפרופיל של המשתמש (גוגל / Strapi / Gravatar); האות הראשונה רק אם התמונה לא נטענת
function avatarHtml(size, fontSize) {
  const initial = (currentUser?.name || '?').charAt(0);
  const fallback = `background:linear-gradient(135deg,var(--primary),var(--primary-light));color:white;width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;font-weight:700;flex-shrink:0`;
  if (!currentUser?.avatar) return `<span style="${fallback}">${initial}</span>`;
  return `<img src="${currentUser.avatar}" alt="" referrerpolicy="no-referrer" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;display:block;flex-shrink:0" onerror="this.outerHTML='<span style=&quot;${fallback}&quot;>${initial}</span>'">`;
}
function injectAccountUI() {
  const actions = document.querySelector('.header-actions');
  if (!actions || document.getElementById('accountBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'accountBtn';
  btn.className = 'icon-btn';
  btn.setAttribute('aria-label', 'חשבון');
  btn.onclick = () => currentUser ? openAccountMenu() : openAuth('login');
  updateAccountBtn(btn);
  // בקצה השמאלי של סרגל הפעולות (אחרי העגלה); בנייד ההמבורגר נשאר בקצה
  const mobileToggle = document.getElementById('mobileMenuToggle');
  if (mobileToggle && mobileToggle.parentNode === actions) actions.insertBefore(btn, mobileToggle);
  else actions.appendChild(btn);
}
// כפתור החיפוש: בדסקטופ בסוף הניווט הראשי (אחרי "הוסף חנות"); בנייד הניווט מוסתר, אז חוזר לסרגל הפעולות
const navMobileQuery = window.matchMedia('(max-width: 720px)');
function placeSearchToggle() {
  const btn = document.getElementById('searchToggle');
  const nav = document.querySelector('.main-nav');
  const actions = document.querySelector('.header-actions');
  if (!btn || !actions) return;
  if (nav && !navMobileQuery.matches) { if (btn.parentNode !== nav) nav.appendChild(btn); }
  else if (btn.parentNode !== actions) actions.insertBefore(btn, actions.firstChild);
}
navMobileQuery.addEventListener('change', placeSearchToggle);
// תפריט הקטגוריות הנפתח בניווט הראשי (נפתח בהצבעה דרך CSS)
function injectCategoriesMenu() {
  const menu = document.getElementById('navCategoriesMenu');
  if (!menu || typeof categories === 'undefined') return;
  menu.innerHTML = categories.map(c => `<a href="products.html?category=${c.id}"><i class="fas ${c.icon}" style="color:${c.color}"></i> ${c.name}</a>`).join('')
    + '<a href="categories.html" class="all"><i class="fas fa-layer-group"></i> כל הקטגוריות</a>'
    + '<a href="products.html" class="all"><i class="fas fa-th-large"></i> כל המוצרים</a>';
}
// טולטיפ קצר לכל כפתור בסרגל הפעולות (מוצג ב-CSS דרך data-tip)
function applyHeaderTooltips() {
  const actions = document.querySelector('.header-actions');
  if (!actions) return;
  const buttons = [...actions.querySelectorAll('.icon-btn'), ...document.querySelectorAll('.main-nav .icon-btn')];
  buttons.forEach(btn => {
    let tip = '';
    if (btn.id === 'searchToggle') tip = 'חיפוש מוצרים, קטגוריות וחנויות';
    else if (btn.id === 'accountBtn') tip = currentUser ? 'החשבון שלי' : 'התחברות / הרשמה';
    else if (btn.id === 'mobileMenuToggle') tip = 'תפריט';
    else if (btn.classList.contains('cart-btn')) tip = 'עגלת הקניות';
    else if (btn.querySelector('.fa-heart')) tip = 'המועדפים שלי';
    if (tip) { btn.setAttribute('data-tip', tip); btn.setAttribute('aria-label', tip); btn.removeAttribute('title'); }
  });
}
// התראת מנהל: תג אדום על האווטאר בכותרת עם מספר החנויות שממתינות לאישור, כדי
// שחנות חדשה תיראה מכל דף באתר בלי להיכנס לפאנל הניהול. מאשרים חנות ולא מוצר -
// אישור החנות מעלה למדף אוטומטית את כל מוצריה.
let adminPending = 0;
let adminPendingLoaded = false;
async function refreshAdminPending() {
  if (!currentUser?.superAdmin) { adminPending = 0; adminPendingLoaded = false; return; }
  if (adminPendingLoaded) return;
  adminPendingLoaded = true;
  try {
    const r = await fetch('/api/store?count=1');
    if (!r.ok) return;
    const { pending } = await r.json();
    adminPending = Number(pending) || 0;
    paintAccountBtn();
    renderAccountMenu();
  } catch { /* ignore */ }
}
function paintAccountBtn(btn) {
  btn = btn || document.getElementById('accountBtn');
  if (!btn) return;
  btn.innerHTML = (currentUser ? avatarHtml(32, 15) : '<i class="fas fa-user"></i>')
    + (adminPending ? `<span class="badge" style="background:#ef4444">${adminPending}</span>` : '');
}
function updateAccountBtn(btn) {
  btn = btn || document.getElementById('accountBtn');
  applyHeaderTooltips();
  // דפים שתלויים בזהות (למשל "המוצרים שלי" ב-add-product.html) מאזינים לאירוע הזה
  document.dispatchEvent(new CustomEvent('userChanged', { detail: { user: currentUser } }));
  paintAccountBtn(btn);
  refreshAdminPending();
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
// חוזרת לאותו דף שממנו יצא (לא לדף הבית - שם אבדה לו העבודה), ואז /api/me מזהה את המשתמש.
function loginWithCommunity() {
  const callback = window.location.href.split('#')[0];
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
    currentUser = { name: displayName(user), email: user.email, avatar: user.avatar || null, superAdmin: !!user.superAdmin };
    localStorage.setItem(STORAGE.USER, JSON.stringify(currentUser));
    updateAccountBtn();
    closeAuth();
    toast(`שלום ${currentUser.name}!`, 'fa-hand-wave');
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
    currentUser = { name: displayName(user), email: user.email, avatar: user.avatar || null };
    localStorage.setItem(STORAGE.USER, JSON.stringify(currentUser));
    updateAccountBtn();
    closeAuth();
    toast(`ברוך הבא ${currentUser.name}!`, 'fa-circle-check');
  } catch {
    toast('שגיאת הרשמה, נסה שוב', 'fa-circle-exclamation');
  }
}
// חיבור-מחדש שקט דרך גשר ה-SSO של הקהילה (הסשן שם חי שנה ומתחדש בכל ביקור):
// הגשר שותל עוגייה משותפת עם טוקן חי וחוזר בדיוק לדף הנוכחי. לכל היותר פעם
// ב-6 שעות, כדי שתקלה בגשר לא תהפוך ללולאת הפניות.
const SSO_RETRY_KEY = 'shop-sso-retry';
function silentReconnect() {
  let last = 0;
  try { last = Number(localStorage.getItem(SSO_RETRY_KEY)) || 0; } catch { /* ignore */ }
  if (Date.now() - last < 6 * 60 * 60 * 1000) return false;
  try { localStorage.setItem(SSO_RETRY_KEY, String(Date.now())); } catch { /* ignore */ }
  window.location.replace(`https://community.gofreeil.com/sso?callback=${encodeURIComponent(window.location.href)}`);
  return true;
}
// מזהה משתמש מחובר לפי העוגייה המשותפת (בטעינת הדף / חזרה מ-SSO).
// משתמש שהתחבר במכשיר הזה נשאר מחובר עד שהוא עצמו לוחץ "התנתקות": טוקן שפג או
// עוגייה שנעלמה מחודשים דרך הקהילה, ותקלת שרת רגעית לא מנתקת אותו.
async function hydrateUser() {
  try {
    const res = await fetch('/api/me');
    const { user, expired, transient, renew } = await res.json();
    if (user) {
      currentUser = { name: displayName(user), email: user.email, avatar: user.avatar || null, superAdmin: !!user.superAdmin };
      localStorage.setItem(STORAGE.USER, JSON.stringify(currentUser));
      if (renew) silentReconnect();
      else { try { localStorage.removeItem(SSO_RETRY_KEY); } catch { /* ignore */ } }
    } else if (transient) {
      return; // השרת לא ענה - נשארים במצב הקודם
    } else if (currentUser || expired) {
      if (silentReconnect()) return;
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
      <div style="width:64px;height:64px;margin:0 auto 12px">${avatarHtml(64, 26)}</div>
      <h2 style="font-size:20px;margin-bottom:4px">${currentUser.name}</h2>
      <p style="color:var(--text-muted);font-size:13px">${currentUser.email}</p>
      ${currentUser.superAdmin ? '<span style="display:inline-block;margin-top:8px;padding:3px 12px;border-radius:999px;background:linear-gradient(135deg,#f59e0b,#4f46e5);color:#fff;font-size:12px;font-weight:700"><i class="fas fa-crown"></i> מנהל ראשי</span>' : ''}
    </div>
    <div style="display:grid;gap:6px">
      ${currentUser.superAdmin ? `
      <div class="account-menu-section">ניהול האתר</div>
      <a href="admin.html#stores" class="btn btn-ghost btn-block" style="justify-content:flex-start"><i class="fas fa-shield-halved" style="color:#4f46e5"></i> ניהול החנות${adminPending ? ` <span style="margin-right:auto;background:#ef4444;color:#fff;font-size:12px;font-weight:700;border-radius:999px;padding:2px 9px">${adminPending === 1 ? 'חנות ממתינה לאישור' : `${adminPending} חנויות ממתינות`}</span>` : ''}</a>
      <button class="btn btn-ghost btn-block" onclick="closeAccountMenu();document.getElementById('seToggle')?.click()" style="justify-content:flex-start"><i class="fas fa-pen-to-square" style="color:#f59e0b"></i> עריכת תוכן האתר</button>` : ''}
      <div class="account-menu-section">האזור האישי</div>
      <a href="account.html" class="btn btn-ghost btn-block" style="justify-content:flex-start"><i class="fas fa-user-circle" style="color:var(--primary)"></i> החשבון שלי - הזמנות, מועדפים ועדכונים</a>
      <button class="btn btn-ghost btn-block" onclick="closeAccountMenu();openWishlist()" style="justify-content:flex-start"><i class="fas fa-heart" style="color:#ef4444"></i> המועדפים שלי <span style="margin-right:auto;color:var(--text-muted)">${wishlist.length}</span></button>
      <a href="cart.html" class="btn btn-ghost btn-block" style="justify-content:flex-start"><i class="fas fa-shopping-bag"></i> העגלה שלי</a>
      <div class="account-menu-section">החנות שלי</div>
      <a href="seller-dashboard.html" class="btn btn-ghost btn-block" style="justify-content:flex-start"><i class="fas fa-chart-line" style="color:var(--accent-2)"></i> לוח בקרה למוכר</a>
      <a href="add-product.html#mine" class="btn btn-ghost btn-block" style="justify-content:flex-start"><i class="fas fa-store"></i> המוצרים שהגשתי למכירה</a>
      <a href="sell.html?edit=1" class="btn btn-ghost btn-block" style="justify-content:flex-start"><i class="fas fa-pen" style="color:var(--primary)"></i> עריכת פרטי החנות</a>
      <a href="store-designer.html" class="btn btn-ghost btn-block" style="justify-content:flex-start"><i class="fas fa-wand-magic-sparkles" style="color:#a855f7"></i> עיצוב דף החנות</a>
      <button class="btn btn-ghost btn-block" onclick="logoutUser()" style="justify-content:flex-start;color:#ef4444;margin-top:10px"><i class="fas fa-sign-out-alt"></i> התנתקות</button>
    </div>
  `;
}
async function logoutUser() {
  try { await fetch('/api/login?logout=1', { method: 'POST' }); } catch { /* ignore */ }
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
    // מנהל עוקף את הקאש - אחרת מוצר שמחק/הסתיר חוזר אליו לכמה דקות אחרי רענון
    const res = await fetch('/api/seller-products' + (currentUser?.superAdmin ? '?fresh=1' : ''));
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
// החנויות המאושרות עצמן (לא רק דרך המוצרים) - כך חנות מאושרת מופיעה בקניון
// גם לפני שעלו לה מוצרים. נטען במקביל למוצרים, ומרנדר מחדש דרך productsUpdated.
let approvedStores = [];
async function loadApprovedStores() {
  try {
    const res = await fetch('/api/store?public=1');
    if (!res.ok) return;
    const { stores } = await res.json();
    if (!Array.isArray(stores) || !stores.length) return;
    approvedStores = stores;
    document.dispatchEvent(new CustomEvent('productsUpdated', { detail: { stores: stores.length } }));
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
// מוצרים אמיתיים = מוצרים של מוכרים שאושרו (לא מוצרי ההדגמה הקבועים ב-data/products.js)
function realProducts() {
  return products.filter(p => p.storeSlug || p.seller);
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
  // רשומת החנות המאושרת היא המקור העדכני לפרטי החנות; חנות בלי מוצרים נכנסת כמו שהיא
  for (const st of approvedStores) {
    const s = map.get(st.slug);
    if (!s) { map.set(st.slug, { ...st, products: [] }); continue; }
    for (const k of ['name', 'logo', 'phone', 'whatsapp', 'city', 'website', 'description']) if (st[k]) s[k] = st[k];
  }
  return [...map.values()].sort((a, b) => b.products.length - a.products.length);
}
// כל חנות בשורה בפני עצמה: לוגו, שם, תיאור, פרטי קשר, הצצה למוצרים - וכל
// השורה היא קישור לדף החנות (פרופיל + כל המוצרים שלה).
function storeCard(s) {
  const cats = [...new Set(s.products.map(p => (categories.find(c => c.id === p.category) || {}).name).filter(Boolean))].slice(0, 3);
  const THUMBS = 5;
  const thumbs = s.products.slice(0, THUMBS).map(p =>
    `<span class="store-thumb">${p.image ? `<img src="${p.image}" alt="${p.name}" loading="lazy">` : (p.emoji || '📦')}</span>`).join('');
  const more = s.products.length > THUMBS ? `<span class="store-thumb store-thumb-more" dir="ltr">+${s.products.length - THUMBS}</span>` : '';
  return `
    <a href="store.html?s=${encodeURIComponent(s.slug)}" class="store-card">
      ${storeLogoHtml(s, 72)}
      <div class="store-card-body">
        <h3>${s.name}</h3>
        <p>${s.description || cats.join(' · ')}</p>
        <div class="store-card-meta">
          <span><i class="fas fa-box"></i> ${s.products.length} מוצרים</span>
          ${s.city ? `<span><i class="fas fa-location-dot"></i> ${s.city}</span>` : ''}
          ${s.phone ? `<span><i class="fas fa-phone"></i> ${s.phone}</span>` : ''}
          ${s.description && cats.length ? `<span><i class="fas fa-tags"></i> ${cats.join(' · ')}</span>` : ''}
        </div>
      </div>
      <div class="store-card-side">
        ${thumbs ? `<div class="store-thumbs">${thumbs}${more}</div>` : ''}
        <span class="store-card-go">לחנות ולכל המוצרים <i class="fas fa-arrow-left"></i></span>
      </div>
    </a>`;
}
function openStoreCard() {
  return `
    <a href="sell.html" class="store-card store-card-open">
      <span class="store-logo store-logo-letter" style="width:72px;height:72px;font-size:30px"><i class="fas fa-plus"></i></span>
      <div class="store-card-body">
        <h3>פתח חנות בקניון</h3>
        <p>לוגו, טלפון ומוצרים לפי קטגוריות. החנות לוקחת 10% ממכירה, השאר אליכם.</p>
      </div>
      <div class="store-card-side">
        <span class="store-card-go">לפתיחת חנות <i class="fas fa-arrow-left"></i></span>
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
// === Init ===
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSearch();
  injectAccountUI();
  injectCategoriesMenu();
  applyHeaderTooltips();
  hydrateUser();
  loadSellerProducts();
  loadApprovedStores();
  loadRatingSummary();
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
    if (e.key === 'Escape') {
      if (lightboxOpen()) return closeLightbox();
      closeQuickView(); closeAuth(); closeWishlist(); closeAccountMenu();
    }
    // חיצים: דפדוף בגלריה (בלייטבוקס או בחלון המוצר). RTL: חץ שמאלה = הבאה
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const d = e.key === 'ArrowLeft' ? 1 : -1;
      if (lightboxOpen()) lbStep(d);
      else if (document.getElementById('quickViewModal')?.classList.contains('active') && qvGallery.imgs.length > 1) qvStep(d);
    }
  });
  // קישור עמוק למוצר (מקישורי שיתוף /p/<id>): ?product=<id> פותח את חלון המוצר.
  // מוצרי מוכרים מגיעים מהשרת אחרי הטעינה - מנסים שוב כשהם נטענים.
  const deepId = Number(new URLSearchParams(location.search).get('product'));
  if (deepId && document.getElementById('quickViewModal')) {
    const tryOpen = () => { if (products.some(p => p.id === deepId)) { openQuickView(deepId); return true; } return false; };
    if (!tryOpen()) document.addEventListener('productsUpdated', tryOpen, { once: true });
  }
});
