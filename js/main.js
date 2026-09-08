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
  // rendered twice: inside the hero (desktop) and in its own section (mobile/tablet); CSS shows one at a time
  const targets = ['categoriesGrid', 'heroCategoriesGrid'].map(id => document.getElementById(id)).filter(Boolean);
  if (!targets.length) return;
  const html = categories.map(c => {
    const count = products.filter(p => p.category === c.id).length;
    return `
      <a href="products.html?category=${c.id}" class="category-card${c.image ? ' has-image' : ''}">
        ${c.image ? `<h3>${c.name}</h3><div class="category-bg" style="background-image:url('${c.image}')"></div>` : `<div class="category-icon" style="background: linear-gradient(135deg, ${c.color}, ${c.color}dd)">
          <i class="fas ${c.icon}"></i>
        </div><h3>${c.name}</h3>`}
        <p>${c.desc}</p>
        <span class="count">${count} מוצרים <i class="fas fa-arrow-left"></i></span>
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
        ${shareBarHtml(p)}
        <div style="margin-top:24px;padding-top:24px;border-top:1px solid var(--border);display:grid;gap:8px;font-size:14px;color:var(--text-muted)">
          <div><i class="fas fa-truck" style="color:var(--primary);width:24px"></i> משלוח חינם מעל 199₪</div>
          <div><i class="fas fa-rotate-left" style="color:var(--primary);width:24px"></i> החזרה תוך 30 יום</div>
          <div><i class="fas fa-shield-halved" style="color:var(--primary);width:24px"></i> תשלום מאובטח SSL</div>
        </div>
      </div>
    </div>
    <div id="qvRecs" data-for="${p.id}"></div>
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
  content.scrollTop = 0;
  attachSwipe(document.getElementById('qvMain'), d => qvStep(d));
  renderRecommendations(p);
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
  // מתחת להדר (ולא מעליו) - ההדר נשאר ראשון ודביק, הבאנר נגלל עם הדף
  const header = document.querySelector('.header');
  if (header) header.insertAdjacentElement('afterend', banner);
  else document.body.insertBefore(banner, document.body.firstChild);
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
  actions.insertBefore(btn, actions.firstChild);
}
function updateAccountBtn(btn) {
  btn = btn || document.getElementById('accountBtn');
  // דפים שתלויים בזהות (למשל "המוצרים שלי" ב-sell.html) מאזינים לאירוע הזה
  document.dispatchEvent(new CustomEvent('userChanged', { detail: { user: currentUser } }));
  if (!btn) return;
  btn.innerHTML = currentUser
    ? avatarHtml(28, 13)
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
// מזהה משתמש מחובר לפי העוגייה המשותפת (בטעינת הדף / חזרה מ-SSO)
async function hydrateUser() {
  try {
    const res = await fetch('/api/me');
    const { user } = await res.json();
    if (user) {
      currentUser = { name: displayName(user), email: user.email, avatar: user.avatar || null, superAdmin: !!user.superAdmin };
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
      <div style="width:64px;height:64px;margin:0 auto 12px">${avatarHtml(64, 26)}</div>
      <h2 style="font-size:20px;margin-bottom:4px">${currentUser.name}</h2>
      <p style="color:var(--text-muted);font-size:13px">${currentUser.email}</p>
      ${currentUser.superAdmin ? '<span style="display:inline-block;margin-top:8px;padding:3px 12px;border-radius:999px;background:linear-gradient(135deg,#f59e0b,#4f46e5);color:#fff;font-size:12px;font-weight:700"><i class="fas fa-crown"></i> מנהל ראשי</span>' : ''}
    </div>
    <div style="display:grid;gap:6px">
      ${currentUser.superAdmin ? `
      <a href="admin.html" class="btn btn-ghost btn-block" style="justify-content:flex-start"><i class="fas fa-shield-halved" style="color:#4f46e5"></i> ניהול החנות</a>
      <button class="btn btn-ghost btn-block" onclick="closeAccountMenu();document.getElementById('seToggle')?.click()" style="justify-content:flex-start"><i class="fas fa-pen-to-square" style="color:#f59e0b"></i> עריכת תוכן האתר</button>` : ''}
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
        <h3>פתח חנות בקניון</h3>
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
