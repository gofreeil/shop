// === עורך תוכן בתוך האתר (סופר-אדמין) ===
// כל טקסט ותמונה קבועים בדף מקבלים גלגל שיניים קטן במצב עריכה. עריכה נשמרת
// כ"דריסה" ב-Strapi (shop-site-overrides דרך api/site-content.js) ומוחלת בכל
// טעינת דף מעל ה-HTML הקבוע - בלי דיפלוי. הזיהוי של אלמנט הוא הדף + הנתיב
// שלו בעץ ה-HTML הקבוע (או product:<id> לתמונת מוצר).
//
// הסקריפט חייב להיטען מיד אחרי js/main.js ולפני הסקריפט של הדף: בזמן הריצה
// שלו ה-DOM הוא ה-HTML הקבוע בלבד, וזה מה שמצלם את רשימת האלמנטים הניתנים
// לעריכה. תוכן שנוצר אחר כך ב-JS (מוצרים, מודלים, באנר) אינו נערך כאן.
(() => {
  'use strict';

  const PAGE = (location.pathname.replace(/^\/+|\.html$/g, '') || 'index').toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 40);
  const API = '/api/site-content';
  const SKIP = 'script,style,noscript,template,.modal,#toast,#lightbox,.search-bar,#constructionBanner,#accountBtn,.se-ui,input,select,textarea,option,[data-noedit]';
  const TEXT_STYLE_KEYS = ['fontSize', 'lineHeight', 'fontWeight', 'textAlign', 'color', 'marginTop', 'marginBottom', 'letterSpacing'];
  const IMAGE_STYLE_KEYS = ['width', 'height', 'maxWidth', 'objectFit', 'objectPosition', 'borderRadius', 'marginTop', 'marginBottom', 'opacity'];

  // --- צילום ה-HTML הקבוע (בזמן טעינת הסקריפט, לפני רינדור דינמי) ---
  const STATIC = new WeakSet();
  const ORIGINAL = new Map();   // key -> {el, kind, html, style, src, alt}
  const KEY_OF = new WeakMap(); // el -> key
  const overrides = new Map();  // key -> {kind, data}
  let productOverrides = new Map(); // id -> data
  let isAdmin = false, editing = false;

  document.querySelectorAll('body *').forEach(el => STATIC.add(el));

  function siblingIndex(el) {
    let i = 1, s = el;
    while ((s = s.previousElementSibling)) if (s.tagName === el.tagName && STATIC.has(s)) i++;
    return i;
  }
  function keyOf(el) {
    if (KEY_OF.has(el)) return KEY_OF.get(el);
    if (el.dataset.edit) { KEY_OF.set(el, el.dataset.edit); return el.dataset.edit; }
    const parts = [];
    let n = el;
    while (n && n !== document.body) {
      if (n.id && STATIC.has(n)) { parts.unshift('#' + n.id); break; }
      const i = siblingIndex(n);
      parts.unshift(n.tagName.toLowerCase() + (i > 1 ? ':' + i : ''));
      n = n.parentElement;
    }
    const key = PAGE + '|' + parts.join('>');
    KEY_OF.set(el, key);
    return key;
  }
  function hasOwnText(el) {
    for (const c of el.childNodes) if (c.nodeType === 3 && c.textContent.trim()) return true;
    return false;
  }
  // טקסט שהוא רק מספר/סימן (מונים, מחירים) מתעדכן ב-JS - לא לעריכה
  function ownTextIsData(el) {
    const t = Array.from(el.childNodes).filter(c => c.nodeType === 3).map(c => c.textContent).join('').trim();
    return !/[A-Za-z֐-׿]/.test(t);
  }
  // סריקת האלמנטים הקבועים: החיצוני ביותר עם טקסט ישיר = טקסט; img = תמונה
  (function collect() {
    const picked = new Set();
    for (const el of document.querySelectorAll('body *')) {
      if (!STATIC.has(el) || el.closest(SKIP)) continue;
      let anc = el.parentElement, covered = false;
      while (anc && anc !== document.body) { if (picked.has(anc)) { covered = true; break; } anc = anc.parentElement; }
      if (covered) continue;
      if (el.tagName === 'IMG') {
        picked.add(el);
        ORIGINAL.set(keyOf(el), { el, kind: 'image', src: el.getAttribute('src') || '', alt: el.getAttribute('alt') || '', style: el.getAttribute('style') || '' });
      } else if (hasOwnText(el) && !ownTextIsData(el)) {
        picked.add(el);
        ORIGINAL.set(keyOf(el), { el, kind: 'text', html: el.innerHTML, style: el.getAttribute('style') || '' });
      }
    }
  })();

  // --- ניקוי HTML של טקסט (נכנס ל-innerHTML אצל כל הגולשים) ---
  const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'SPAN', 'BR', 'A', 'SMALL', 'SUP', 'SUB', 'MARK']);
  const SAFE_HREF = /^(https?:\/\/|\/|#|mailto:|tel:|[\w.-]+\.html)/i;
  function cleanNode(node) {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3) continue;
      if (child.nodeType !== 1) { child.remove(); continue; }
      const tag = child.tagName;
      if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|SVG|MATH|TEMPLATE|NOSCRIPT)$/.test(tag)) { child.remove(); continue; }
      if (!ALLOWED_TAGS.has(tag)) {
        if (/^(DIV|P|LI|H[1-6])$/.test(tag) && child.previousSibling) node.insertBefore(document.createElement('br'), child);
        cleanNode(child);
        while (child.firstChild) node.insertBefore(child.firstChild, child);
        child.remove();
        continue;
      }
      for (const a of Array.from(child.attributes)) {
        const n = a.name.toLowerCase(), v = a.value.trim();
        const ok = n === 'class'
          || (n === 'style' && !/url\s*\(|expression|javascript|@import/i.test(v))
          || (tag === 'A' && ((n === 'href' && SAFE_HREF.test(v)) || n === 'target' || n === 'rel' || n === 'title'));
        if (!ok) child.removeAttribute(a.name);
      }
      cleanNode(child);
    }
  }
  function sanitizeHtml(html) {
    const t = document.createElement('template');
    t.innerHTML = String(html || '');
    cleanNode(t.content);
    return t.innerHTML;
  }

  // --- החלת סגנון ---
  const SAFE_CSS = /^[\w\s.%#(),\-]{1,60}$/;
  function applyStyle(el, kind, style, base) {
    el.setAttribute('style', base || '');
    if (!style) return;
    const keys = kind === 'text' ? TEXT_STYLE_KEYS : IMAGE_STYLE_KEYS;
    for (const k of keys) if (typeof style[k] === 'string' && SAFE_CSS.test(style[k])) el.style[k] = style[k];
    if (kind !== 'text' && style.align && style.align !== 'default') {
      el.style.display = 'block';
      el.style.marginLeft = style.align === 'left' ? '0' : 'auto';
      el.style.marginRight = style.align === 'right' ? '0' : 'auto';
    }
    if (style.hidden) el.style.display = 'none';
  }
  function applyText(el, data, base) {
    el.innerHTML = sanitizeHtml(data.html);
    applyStyle(el, 'text', data.style, base);
  }
  function applyImage(el, data, base) {
    if (data.src) el.src = data.src;
    if (typeof data.alt === 'string' && data.alt) el.alt = data.alt;
    applyStyle(el, 'image', data.style, base);
  }
  // דריסה חלה רק אם ה-JS של הדף לא שינה את האלמנט בינתיים (אלמנט שמתמלא
  // דינמית - שם חנות, כותרת קטגוריה - לא נדרס). אחרי ההחלה מעדכנים את הצילום.
  function applyOverride(key, ov) {
    const o = ORIGINAL.get(key);
    if (!o || o.kind !== ov.kind) return;
    const el = o.el;
    if (o.kind === 'text') {
      if (el.innerHTML !== o.html && el.innerHTML !== o.applied) return;
      applyText(el, ov.data, o.style);
      o.applied = el.innerHTML;
    } else {
      applyImage(el, ov.data, o.style);
    }
  }
  function applyAll() {
    for (const [key, ov] of overrides) {
      if (key.startsWith('product:')) continue;
      applyOverride(key, ov);
    }
    applyProductOverrides();
  }

  // --- תמונות מוצר (product:<id>) - מעדכנות את רשימת המוצרים + הכרטיסים המוצגים ---
  function applyProductOverrides() {
    if (!productOverrides.size) return;
    let changed = false;
    // products מוגדר ב-const ב-data/products.js (לא על window)
    const list = typeof products !== 'undefined' && Array.isArray(products) ? products : [];
    {
      for (const p of list) {
        const d = productOverrides.get(p.id);
        if (!d || !d.src || p.image === d.src) continue;
        p.image = d.src;
        p.images = [d.src, ...(Array.isArray(p.images) ? p.images.slice(1) : [])];
        changed = true;
      }
    }
    patchProductCards();
    if (changed) document.dispatchEvent(new CustomEvent('productsUpdated', { detail: { overrides: true } }));
  }
  function patchProductCards() {
    for (const card of document.querySelectorAll('.product-card[data-id]')) {
      const d = productOverrides.get(Number(card.dataset.id));
      if (!d) continue;
      const box = card.querySelector('.product-image');
      let img = box?.querySelector('img.product-photo');
      if (d.src && !img && box) {
        box.querySelector('span')?.remove();
        img = document.createElement('img');
        img.className = 'product-photo';
        img.alt = '';
        box.prepend(img);
      }
      if (!img) continue;
      if (d.src && img.getAttribute('src') !== d.src) img.src = d.src;
      const s = d.style || {};
      img.style.objectFit = s.objectFit && SAFE_CSS.test(s.objectFit) ? s.objectFit : '';
      img.style.objectPosition = s.objectPosition && SAFE_CSS.test(s.objectPosition) ? s.objectPosition : '';
    }
  }
  let cardObserver = null;
  function watchProductCards() {
    if (cardObserver || !productOverrides.size) return;
    let t = 0;
    cardObserver = new MutationObserver(() => { clearTimeout(t); t = setTimeout(patchProductCards, 30); });
    cardObserver.observe(document.body, { childList: true, subtree: true });
  }
  document.addEventListener('productsUpdated', e => { if (!e.detail?.overrides) applyProductOverrides(); });

  // --- טעינה ---
  async function load() {
    try {
      const res = await fetch(`${API}?page=${encodeURIComponent(PAGE)}`);
      if (!res.ok) return;
      const { items } = await res.json();
      overrides.clear();
      productOverrides = new Map();
      for (const it of items || []) {
        if (!it?.key || !it.data) continue;
        overrides.set(it.key, { kind: it.kind, data: it.data });
        if (it.key.startsWith('product:')) productOverrides.set(Number(it.key.slice(8)), it.data);
      }
      applyAll();
      watchProductCards();
      renderToggle();
      if (editing) refreshGears();
    } catch { /* offline / dev ללא API */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();

  // --- זיהוי סופר-אדמין ---
  function setAdmin(v) {
    isAdmin = !!v;
    if (isAdmin) ensureUI();
    const t = document.getElementById('seToggle');
    if (t) t.hidden = !isAdmin;
    if (!isAdmin && editing) exitEditMode();
  }
  document.addEventListener('userChanged', e => setAdmin(e.detail?.user?.superAdmin));
  try { const u = JSON.parse(localStorage.getItem('noshop_user') || 'null'); if (u?.superAdmin) setAdmin(true); } catch { /* ignore */ }

  // --- ממשק העריכה ---
  const CSS = `
.se-ui{font-family:'Heebo',system-ui,sans-serif;direction:rtl}
#seToggle{position:fixed;bottom:18px;left:18px;z-index:4000;display:flex;align-items:center;gap:8px;padding:10px 16px;border:0;border-radius:999px;background:linear-gradient(135deg,#f59e0b,#4f46e5);color:#fff;font-weight:700;font-size:14px;box-shadow:0 10px 25px -5px rgba(0,0,0,.35);cursor:pointer}
#seToggle[hidden]{display:none}
#seToggle.on{background:linear-gradient(135deg,#ef4444,#b91c1c)}
#seToggle .se-count{background:rgba(255,255,255,.25);border-radius:999px;padding:0 8px;font-size:12px}
body.se-editing .se-editable{outline:1px dashed rgba(79,70,229,.45);outline-offset:2px;cursor:pointer}
body.se-editing .se-editable:hover{outline:2px dashed #4f46e5;background:rgba(79,70,229,.06)}
body.se-editing .se-active{outline:2px solid #f59e0b !important;background:rgba(245,158,11,.08);cursor:text}
body.se-editing .se-hidden-preview{opacity:.35}
#seGears{position:fixed;inset:0;z-index:3900;pointer-events:none}
#seGears[hidden]{display:none}
.se-gear{position:absolute;width:22px;height:22px;border-radius:50%;background:#4f46e5;color:#fff;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:11px;cursor:pointer;pointer-events:auto;transform:translate(-50%,-50%);padding:0}
.se-gear:hover{background:#f59e0b;transform:translate(-50%,-50%) scale(1.15)}
.se-gear.img{background:#0d9488}
.se-gear.done{background:#16a34a}
#sePanel{position:fixed;top:0;left:0;bottom:0;width:min(340px,92vw);z-index:4100;background:#fff;color:#0c4a6e;box-shadow:8px 0 30px rgba(0,0,0,.25);display:flex;flex-direction:column;font-size:14px}
#sePanel[hidden]{display:none}
.se-head{padding:14px 16px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:8px}
.se-head h3{margin:0;font-size:16px}
.se-head small{display:block;color:#64748b;font-size:11px;word-break:break-all;max-height:2.6em;overflow:hidden}
.se-body{flex:1;overflow:auto;padding:12px 16px}
.se-row{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.se-row label{flex:0 0 96px;color:#334155;font-size:13px}
.se-row input[type=number],.se-row input[type=text],.se-row select{flex:1;min-width:0;padding:6px 8px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px;background:#fff;color:inherit}
.se-row input[type=range]{flex:1}
.se-row input[type=color]{width:38px;height:30px;padding:0;border:1px solid #cbd5e1;border-radius:8px;background:#fff}
.se-seg{display:flex;flex:1;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden}
.se-seg button{flex:1;border:0;background:#fff;padding:6px;cursor:pointer;color:#334155;font:inherit;font-size:13px}
.se-seg button.on{background:#4f46e5;color:#fff}
.se-hint{color:#64748b;font-size:12px;margin:-4px 0 10px}
.se-sec{font-weight:700;font-size:12px;color:#4f46e5;margin:14px 0 8px;letter-spacing:.3px}
.se-preview{width:100%;height:140px;object-fit:contain;background:repeating-conic-gradient(#f1f5f9 0 25%,#fff 0 50%) 0 0/16px 16px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:10px;display:block}
.se-file{display:flex;align-items:center;justify-content:center;gap:8px;padding:10px;border:2px dashed #cbd5e1;border-radius:10px;cursor:pointer;color:#334155;margin-bottom:10px}
.se-file:hover{border-color:#4f46e5}
.se-file input{display:none}
.se-foot{padding:12px 16px;border-top:1px solid #e2e8f0;display:flex;flex-wrap:wrap;gap:8px}
.se-btn{flex:1;padding:9px 12px;border:0;border-radius:10px;font:inherit;font-weight:700;font-size:13px;cursor:pointer;background:#e2e8f0;color:#0f172a;white-space:nowrap}
.se-btn.primary{background:#4f46e5;color:#fff}
.se-btn.danger{background:#fee2e2;color:#b91c1c}
.se-btn:disabled{opacity:.5;cursor:default}
.se-err{color:#b91c1c;font-size:13px;margin-top:6px;flex-basis:100%}
.se-x{border:0;background:transparent;font-size:18px;cursor:pointer;color:#64748b}
@media (max-width:640px){#sePanel{top:auto;height:70vh;width:100%;border-radius:16px 16px 0 0}}
`;
  let uiReady = false;
  function ensureUI() {
    if (uiReady) return;
    uiReady = true;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    const btn = document.createElement('button');
    btn.id = 'seToggle';
    btn.className = 'se-ui';
    btn.type = 'button';
    btn.onclick = () => editing ? exitEditMode() : enterEditMode();
    document.body.appendChild(btn);
    renderToggle();
    const layer = document.createElement('div');
    layer.id = 'seGears';
    layer.className = 'se-ui';
    layer.hidden = true;
    document.body.appendChild(layer);
    const panel = document.createElement('div');
    panel.id = 'sePanel';
    panel.className = 'se-ui';
    panel.hidden = true;
    document.body.appendChild(panel);
    window.addEventListener('scroll', () => editing && positionGears(), { passive: true });
    window.addEventListener('resize', () => editing && positionGears());
    document.addEventListener('click', onEditClick, true);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && current) { e.stopPropagation(); cancelEdit(); } }, true);
  }
  function renderToggle() {
    const b = document.getElementById('seToggle');
    if (!b) return;
    const n = overrides.size;
    b.classList.toggle('on', editing);
    b.innerHTML = editing
      ? '<i class="fas fa-check"></i> סיום עריכה'
      : `<i class="fas fa-gear"></i> עריכת האתר ${n ? `<span class="se-count">${n}</span>` : ''}`;
  }

  // --- מצב עריכה: גלגלי שיניים ---
  let gearObserver = null, gearTimer = 0;
  function editableTargets() {
    const list = [];
    for (const [key, o] of ORIGINAL) {
      if (!o.el.isConnected) continue;
      // אלמנט ש-JS של הדף שינה (ולא אנחנו) הוא דינמי - לא נערך
      if (o.kind === 'text' && o.el !== current?.el && o.el.innerHTML !== o.html && o.el.innerHTML !== o.applied) continue;
      list.push({ key, el: o.el, kind: o.kind });
    }
    for (const card of document.querySelectorAll('.product-card[data-id]')) {
      const box = card.querySelector('.product-image');
      if (box) list.push({ key: 'product:' + Number(card.dataset.id), el: box, kind: 'product' });
    }
    return list;
  }
  function enterEditMode() {
    editing = true;
    document.body.classList.add('se-editing');
    document.getElementById('seGears').hidden = false;
    renderToggle();
    refreshGears();
    gearObserver = new MutationObserver(muts => {
      if (muts.every(m => m.target.closest?.('.se-ui'))) return;
      clearTimeout(gearTimer);
      gearTimer = setTimeout(refreshGears, 80);
    });
    gearObserver.observe(document.body, { childList: true, subtree: true });
    if (typeof toast === 'function') toast('מצב עריכה: לחצו על גלגל שיניים ליד טקסט או תמונה', 'fa-gear');
  }
  function exitEditMode() {
    if (current) cancelEdit();
    editing = false;
    gearObserver?.disconnect();
    gearObserver = null;
    document.body.classList.remove('se-editing');
    document.querySelectorAll('.se-editable').forEach(el => el.classList.remove('se-editable', 'se-hidden-preview'));
    for (const [key, ov] of overrides) if (ov.data?.style?.hidden) { const o = ORIGINAL.get(key); if (o) o.el.style.display = 'none'; }
    const layer = document.getElementById('seGears');
    layer.hidden = true;
    layer.innerHTML = '';
    gearMap = new Map();
    renderToggle();
  }
  let gearMap = new Map(); // el -> gear
  function refreshGears() {
    if (!editing) return;
    const layer = document.getElementById('seGears');
    const targets = editableTargets();
    const seen = new Set();
    for (const t of targets) {
      seen.add(t.el);
      t.el.classList.add('se-editable');
      if (t.kind !== 'product' && overrides.get(t.key)?.data?.style?.hidden && t.el !== current?.el) {
        t.el.style.display = '';
        t.el.classList.add('se-hidden-preview');
      }
      let g = gearMap.get(t.el);
      if (!g) {
        g = document.createElement('button');
        g.type = 'button';
        g.className = 'se-gear' + (t.kind === 'text' ? '' : ' img');
        g.innerHTML = '<i class="fas fa-gear"></i>';
        g.title = t.kind === 'text' ? 'עריכת טקסט' : 'עריכת תמונה';
        g.onclick = e => { e.preventDefault(); e.stopPropagation(); openEditor(g._target); };
        layer.appendChild(g);
        gearMap.set(t.el, g);
      }
      g.classList.toggle('done', overrides.has(t.key));
      g._target = t;
    }
    for (const [el, g] of gearMap) if (!seen.has(el)) { g.remove(); gearMap.delete(el); }
    positionGears();
  }
  let posRaf = 0;
  function positionGears() {
    cancelAnimationFrame(posRaf);
    posRaf = requestAnimationFrame(() => {
      for (const [el, g] of gearMap) {
        const r = el.getBoundingClientRect();
        const visible = r.width > 0 && r.height > 0 && r.bottom > -20 && r.top < innerHeight + 20;
        g.style.display = visible ? '' : 'none';
        if (!visible) continue;
        g.style.left = Math.min(innerWidth - 12, r.right - 2) + 'px';
        g.style.top = Math.max(12, r.top + 2) + 'px';
      }
    });
  }
  function onEditClick(e) {
    if (!editing) return;
    if (e.target.closest('.se-ui')) return;
    const el = e.target.closest('.se-editable');
    if (!el) return;
    // בזמן עריכת טקסט לחיצה בתוך האלמנט מזיזה את הסמן; אלמנטים אחרים נפתחים לעריכה
    if (current && el === current.el) return;
    e.preventDefault();
    e.stopPropagation();
    const g = gearMap.get(el);
    if (g?._target) openEditor(g._target);
  }

  // --- הפאנל ---
  let current = null; // {key, el, kind, snap, base, data, newSrc}
  function openEditor(t) {
    if (current) cancelEdit();
    const o = ORIGINAL.get(t.key);
    const ov = overrides.get(t.key);
    const el = t.el;
    current = {
      key: t.key, el, kind: t.kind,
      snap: { html: el.innerHTML, style: el.getAttribute('style') || '', src: el.getAttribute('src') || '', alt: el.getAttribute('alt') || '' },
      base: o?.style || '',
      data: JSON.parse(JSON.stringify(ov?.data || { style: {} })),
      newSrc: '',
    };
    current.data.style = current.data.style || {};
    el.classList.add('se-active');
    el.classList.remove('se-hidden-preview');
    const panel = document.getElementById('sePanel');
    panel.hidden = false;
    if (t.kind === 'text') renderTextPanel(panel);
    else if (t.kind === 'image') renderImagePanel(panel);
    else renderProductPanel(panel);
    positionGears();
  }
  function shortKey(key) { return key.replace(/^[^|]*\|/, '').replace(/>/g, ' › '); }
  function panelHead(title, key) {
    return `<div class="se-head"><div><h3>${title}</h3><small>${shortKey(key)}</small></div><button type="button" class="se-x" data-act="cancel" title="ביטול"><i class="fas fa-times"></i></button></div>`;
  }
  function panelFoot(hasOverride) {
    return `<div class="se-foot">
      <button type="button" class="se-btn primary" data-act="save"><i class="fas fa-floppy-disk"></i> שמירה</button>
      <button type="button" class="se-btn" data-act="cancel">ביטול</button>
      ${hasOverride ? '<button type="button" class="se-btn danger" data-act="reset" title="מחיקת השינויים וחזרה לתוכן המקורי"><i class="fas fa-rotate-left"></i> חזרה למקור</button>' : ''}
      <div class="se-err" id="seErr"></div>
    </div>`;
  }
  const num = (label, prop, ph, step = 1, min = 0) => `<div class="se-row"><label>${label}</label><input type="number" data-prop="${prop}" placeholder="${ph}" step="${step}" min="${min}"><span style="color:#94a3b8;font-size:12px">px</span></div>`;
  const seg = (label, prop, opts) => `<div class="se-row"><label>${label}</label><div class="se-seg" data-seg="${prop}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" title="${l}">${l}</button>`).join('')}</div></div>`;
  const chk = (label, prop) => `<div class="se-row"><label>${label}</label><input type="checkbox" data-prop="${prop}"></div>`;

  function renderTextPanel(panel) {
    const { el, key } = current;
    const cs = getComputedStyle(el);
    panel.innerHTML = panelHead('עריכת טקסט', key) + `<div class="se-body">
      <p class="se-hint">הטקסט נערך ישירות בדף - לחצו עליו והקלידו. כאן: גודל, יישור ומרווחים.</p>
      <div class="se-sec">גופן</div>
      ${num('גודל', 'fontSize', Math.round(parseFloat(cs.fontSize)))}
      <div class="se-row"><label>עובי</label><select data-prop="fontWeight"><option value="">ברירת מחדל</option>${[300, 400, 500, 600, 700, 800, 900].map(w => `<option value="${w}">${w}</option>`).join('')}</select></div>
      <div class="se-row"><label>גובה שורה</label><input type="number" data-prop="lineHeight" step="0.1" min="0.8" placeholder="${(parseFloat(cs.lineHeight) / parseFloat(cs.fontSize) || 1.6).toFixed(1)}"></div>
      ${num('ריווח אותיות', 'letterSpacing', '0', 0.1, -5)}
      <div class="se-row"><label>צבע</label><input type="color" data-prop="color"><button type="button" class="se-btn" data-act="clearColor" style="flex:0 0 auto;padding:6px 10px">ברירת מחדל</button></div>
      <div class="se-sec">יישור ומרווחים</div>
      ${seg('יישור', 'textAlign', [['', 'אוטו'], ['right', 'ימין'], ['center', 'מרכז'], ['left', 'שמאל']])}
      ${num('מרווח מעל', 'marginTop', Math.round(parseFloat(cs.marginTop)) || 0, 1, -100)}
      ${num('מרווח מתחת', 'marginBottom', Math.round(parseFloat(cs.marginBottom)) || 0, 1, -100)}
      ${chk('הסתרת האלמנט', 'hidden')}
    </div>` + panelFoot(overrides.has(key));
    bindPanel(panel);
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'false');
    el.focus();
  }

  function renderImagePanel(panel) {
    const { el, key } = current;
    panel.innerHTML = panelHead('עריכת תמונה', key) + `<div class="se-body">
      <img class="se-preview" id="sePreview" src="${el.currentSrc || el.src}" alt="">
      <label class="se-file"><i class="fas fa-upload"></i> החלפת תמונה <input type="file" accept="image/*" data-act="file"></label>
      <div class="se-row"><label>טקסט חלופי</label><input type="text" data-prop="alt" placeholder="${el.alt || ''}"></div>
      <div class="se-sec">גודל</div>
      <div class="se-row"><label>רוחב</label><input type="text" data-prop="width" placeholder="${Math.round(el.getBoundingClientRect().width)}px"></div>
      <div class="se-row"><label>גובה</label><input type="text" data-prop="height" placeholder="אוטו"></div>
      <p class="se-hint">px או % (למשל 240px, 50%). ריק = כמו בעיצוב.</p>
      ${num('עיגול פינות', 'borderRadius', Math.round(parseFloat(getComputedStyle(el).borderRadius)) || 0)}
      <div class="se-sec">מיקום</div>
      ${seg('יישור', 'align', [['default', 'אוטו'], ['right', 'ימין'], ['center', 'מרכז'], ['left', 'שמאל']])}
      <div class="se-row"><label>מילוי</label><select data-prop="objectFit"><option value="">ברירת מחדל</option><option value="cover">חיתוך (cover)</option><option value="contain">הכל בפנים (contain)</option><option value="fill">מתיחה</option></select></div>
      <div class="se-row"><label>מוקד אופקי</label><input type="range" data-pos="x" min="0" max="100" value="50"></div>
      <div class="se-row"><label>מוקד אנכי</label><input type="range" data-pos="y" min="0" max="100" value="50"></div>
      <p class="se-hint">המוקד קובע איזה חלק מהתמונה נשאר במרכז כשהיא נחתכת.</p>
      ${num('מרווח מעל', 'marginTop', 0, 1, -100)}
      ${num('מרווח מתחת', 'marginBottom', 0, 1, -100)}
      <div class="se-row"><label>שקיפות</label><input type="range" data-prop="opacity" min="0.1" max="1" step="0.05" value="1"></div>
      ${chk('הסתרת התמונה', 'hidden')}
    </div>` + panelFoot(overrides.has(key));
    bindPanel(panel);
  }

  function renderProductPanel(panel) {
    const { el, key } = current;
    const img = el.querySelector('img.product-photo');
    panel.innerHTML = panelHead('תמונת מוצר', key) + `<div class="se-body">
      ${img ? `<img class="se-preview" id="sePreview" src="${img.currentSrc || img.src}" alt="">` : `<div class="se-preview" id="sePreview" style="display:flex;align-items:center;justify-content:center;font-size:48px">${el.querySelector('span')?.textContent || '📦'}</div>`}
      <label class="se-file"><i class="fas fa-upload"></i> החלפת התמונה הראשית <input type="file" accept="image/*" data-act="file"></label>
      <p class="se-hint">התמונה תחליף את התמונה הראשית של המוצר בכל מקום באתר (כרטיס, חלון מוצר, שיתוף).</p>
      <div class="se-sec">תצוגה בכרטיס</div>
      <div class="se-row"><label>מילוי</label><select data-prop="objectFit"><option value="">ברירת מחדל</option><option value="cover">חיתוך (cover)</option><option value="contain">הכל בפנים (contain)</option></select></div>
      <div class="se-row"><label>מוקד אופקי</label><input type="range" data-pos="x" min="0" max="100" value="50"></div>
      <div class="se-row"><label>מוקד אנכי</label><input type="range" data-pos="y" min="0" max="100" value="50"></div>
    </div>` + panelFoot(overrides.has(key));
    bindPanel(panel);
  }

  function styleTarget() {
    return current.kind === 'product' ? current.el.querySelector('img.product-photo') : current.el;
  }
  function livePreview() {
    const { kind, data } = current;
    const el = styleTarget();
    if (!el) return;
    if (kind === 'text') applyStyle(el, 'text', data.style, current.base);
    else if (kind === 'image') applyStyle(el, 'image', data.style, current.base);
    else { el.style.objectFit = data.style.objectFit || ''; el.style.objectPosition = data.style.objectPosition || ''; }
    if (data.style.hidden) { el.style.display = ''; el.classList.add('se-hidden-preview'); } else el.classList.remove('se-hidden-preview');
    positionGears();
  }
  function bindPanel(panel) {
    const { data } = current;
    const st = data.style;
    const pos = (st.objectPosition || '50% 50%').split(/\s+/);
    panel.querySelectorAll('[data-prop]').forEach(inp => {
      const p = inp.dataset.prop;
      const raw = p === 'alt' ? (data.alt || '') : st[p];
      if (inp.type === 'checkbox') inp.checked = !!raw;
      else if (inp.type === 'color') inp.value = /^#[0-9a-f]{6}$/i.test(raw || '') ? raw : '#000000';
      else if (inp.type === 'range') inp.value = raw || inp.value;
      else if (inp.type === 'number') inp.value = raw ? parseFloat(raw) : '';
      else inp.value = raw || '';
      inp.addEventListener('input', () => {
        let v;
        if (inp.type === 'checkbox') v = inp.checked;
        else if (inp.type === 'number') v = inp.value === '' ? '' : (p === 'lineHeight' ? String(inp.value) : inp.value + 'px');
        else v = inp.value.trim();
        if (p === 'alt') data.alt = v;
        else if (v === '' || v === false) delete st[p];
        else st[p] = v;
        livePreview();
      });
    });
    panel.querySelectorAll('[data-pos]').forEach(r => {
      r.value = parseFloat(pos[r.dataset.pos === 'x' ? 0 : 1]) || 50;
      r.addEventListener('input', () => {
        const x = panel.querySelector('[data-pos=x]').value, y = panel.querySelector('[data-pos=y]').value;
        st.objectPosition = `${x}% ${y}%`;
        if (!st.objectFit && current.kind !== 'product') st.objectFit = 'cover';
        livePreview();
      });
    });
    panel.querySelectorAll('[data-seg]').forEach(s => {
      const p = s.dataset.seg;
      const sync = () => s.querySelectorAll('button').forEach(b => b.classList.toggle('on', (st[p] || (p === 'align' ? 'default' : '')) === b.dataset.v));
      sync();
      s.querySelectorAll('button').forEach(b => { b.onclick = () => { if (b.dataset.v && b.dataset.v !== 'default') st[p] = b.dataset.v; else delete st[p]; sync(); livePreview(); }; });
    });
    panel.querySelector('[data-act=clearColor]')?.addEventListener('click', () => { delete st.color; livePreview(); });
    panel.querySelector('[data-act=file]')?.addEventListener('change', async e => {
      const f = e.target.files?.[0];
      if (!f) return;
      try {
        const src = await resizeImage(f);
        current.newSrc = src;
        const prev = document.getElementById('sePreview');
        if (prev?.tagName === 'IMG') prev.src = src; else if (prev) prev.outerHTML = `<img class="se-preview" id="sePreview" src="${src}" alt="">`;
        if (current.kind === 'image') current.el.src = src;
        else {
          let img = current.el.querySelector('img.product-photo');
          if (!img) { current.el.querySelector('span')?.remove(); img = document.createElement('img'); img.className = 'product-photo'; img.alt = ''; current.el.prepend(img); }
          img.src = src;
        }
        livePreview();
      } catch (ex) { showErr(ex.message || 'התמונה לא נטענה'); }
    });
    panel.querySelectorAll('[data-act=cancel]').forEach(b => { b.onclick = cancelEdit; });
    panel.querySelector('[data-act=save]').onclick = saveEdit;
    panel.querySelector('[data-act=reset]')?.addEventListener('click', resetEdit);
    livePreview();
  }
  function showErr(msg) { const e = document.getElementById('seErr'); if (e) e.textContent = msg || ''; }

  function closePanel() {
    const panel = document.getElementById('sePanel');
    panel.hidden = true;
    panel.innerHTML = '';
    if (current) {
      const el = current.el;
      el.classList.remove('se-active');
      el.removeAttribute('contenteditable');
      el.removeAttribute('spellcheck');
    }
    current = null;
    if (editing) refreshGears();
  }
  function cancelEdit() {
    if (!current) return;
    const { el, kind, snap } = current;
    if (kind === 'text') { el.innerHTML = snap.html; el.setAttribute('style', snap.style); }
    else if (kind === 'image') { el.setAttribute('src', snap.src); el.setAttribute('alt', snap.alt); el.setAttribute('style', snap.style); }
    else {
      // כרטיס מוצר: מחזירים את מה שהיה לפני (תמונה שנוספה רק לתצוגה מקדימה נמחקת)
      const img = el.querySelector('img.product-photo');
      if (img && !snap.html.includes('product-photo')) img.remove();
      else if (img) { const prevSrc = snap.html.match(/class="product-photo"[^>]*src="([^"]*)"/)?.[1]; if (prevSrc) img.src = prevSrc; }
      patchProductCards();
    }
    closePanel();
  }
  async function saveEdit() {
    if (!current) return;
    const { key, el, kind, data } = current;
    const btn = document.querySelector('#sePanel [data-act=save]');
    btn.disabled = true;
    showErr('');
    let payload;
    if (kind === 'text') {
      el.removeAttribute('contenteditable');
      payload = { kind: 'text', data: { html: sanitizeHtml(el.innerHTML), style: data.style } };
    } else {
      // src נשלח רק אם נבחרה תמונה חדשה; אחרת השרת שומר את התמונה הקיימת
      payload = { kind: 'image', data: { src: current.newSrc || '', alt: data.alt || '', style: data.style } };
    }
    try {
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, page: kind === 'product' ? '*' : PAGE, ...payload }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || (res.status === 403 ? 'אין הרשאה - יש להתחבר כסופר-אדמין' : 'השמירה נכשלה'));
      const item = json.item;
      overrides.set(key, { kind: item.kind, data: item.data });
      if (kind === 'product') productOverrides.set(Number(key.slice(8)), item.data);
      const o = ORIGINAL.get(key);
      if (o && kind === 'text') o.applied = el.innerHTML;
      if (kind === 'image' && item.data.src) el.src = item.data.src;
      current = null;
      closePanel();
      if (kind === 'product') { applyProductOverrides(); watchProductCards(); }
      renderToggle();
      if (typeof toast === 'function') toast('נשמר - השינוי מוצג לכל הגולשים', 'fa-circle-check');
    } catch (ex) {
      btn.disabled = false;
      if (kind === 'text') el.setAttribute('contenteditable', 'true');
      showErr(ex.message === 'Failed to fetch' ? 'אין חיבור לשרת' : ex.message);
    }
  }
  async function resetEdit() {
    if (!current) return;
    // אישור דו-שלבי בתוך הפאנל (בלי דיאלוג של הדפדפן): לחיצה ראשונה מבקשת אישור
    const rb = document.querySelector('#sePanel [data-act=reset]');
    if (rb && !rb.dataset.armed) {
      rb.dataset.armed = '1';
      rb.innerHTML = '<i class="fas fa-triangle-exclamation"></i> למחוק את השינויים? לחצו שוב';
      setTimeout(() => { if (rb.isConnected) { delete rb.dataset.armed; rb.innerHTML = '<i class="fas fa-rotate-left"></i> חזרה למקור'; } }, 4000);
      return;
    }
    const { key, el, kind } = current;
    showErr('');
    try {
      const res = await fetch(`${API}?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(res.status === 403 ? 'אין הרשאה' : 'המחיקה נכשלה');
      overrides.delete(key);
      const o = ORIGINAL.get(key);
      if (kind === 'text' && o) { el.innerHTML = o.html; el.setAttribute('style', o.style); o.applied = undefined; }
      else if (kind === 'image' && o) { el.setAttribute('src', o.src); el.setAttribute('alt', o.alt); el.setAttribute('style', o.style); }
      else if (kind === 'product') {
        productOverrides.delete(Number(key.slice(8)));
        const img = el.querySelector('img.product-photo');
        if (img) { img.style.objectFit = ''; img.style.objectPosition = ''; }
        if (typeof toast === 'function') toast('התמונה המקורית תוצג אחרי רענון הדף', 'fa-rotate-left');
      }
      current = null;
      closePanel();
      renderToggle();
    } catch (ex) { showErr(ex.message); }
  }

  // --- הקטנת תמונה בצד הלקוח (עד 1600px, ~עד 1.2MB) ---
  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) return reject(new Error('הקובץ אינו תמונה'));
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const keepAlpha = file.type === 'image/png' || file.type === 'image/gif' || file.type === 'image/webp';
          const draw = (maxSide, q, asPng) => {
            const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
            const c = document.createElement('canvas');
            c.width = Math.max(1, Math.round(img.width * scale));
            c.height = Math.max(1, Math.round(img.height * scale));
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            return asPng ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', q);
          };
          let out = draw(1600, 0.86, keepAlpha);
          if (out.length > 1_200_000) out = draw(1200, 0.78, keepAlpha);
          if (out.length > 1_200_000) out = draw(1200, 0.75, false);
          if (out.length > 1_500_000) return reject(new Error('התמונה גדולה מדי גם אחרי הקטנה'));
          resolve(out);
        };
        img.onerror = () => reject(new Error('קובץ תמונה לא תקין'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('הקובץ לא נקרא'));
      reader.readAsDataURL(file);
    });
  }
})();
