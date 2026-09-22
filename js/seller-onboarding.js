// מסלול הפתיחה של מוכר חדש - שלב אחד בכל פעם, במקום להטיל עליו את הכל בבת אחת.
//
//   1. פתיחת חנות      (sell.html)
//   2. הרשמה / התחברות (מודאל ההרשמה - כדי שהחנות תישמר בחשבון ויגיעו התראות)
//   3. האזור האישי     (account.html - סיור קצר שמלמד איפה הכל נמצא)
//   4. המוצר הראשון    (add-product.html)
//   5. לוח הבקרה       (seller-dashboard.html - סיור שמלמד לנהל ולערוך)
//   6. עיצוב דף החנות  (store-designer.html - סטודיו מודרך, עשרה סגנונות)
//
// ההתקדמות נגזרת מעובדות (יש חנות? מחובר? הוגש מוצר?) ולא ממונה עיוור, ולכן
// מוכר שכבר עשה שלב לא נשלח אליו שוב. מה שאי אפשר לגזור - שהמשתמש באמת ראה
// את הסיור באזור האישי ובלוח הבקרה - נשמר ב-localStorage.
//
// הקובץ נטען אחרי js/main.js ו-js/seller-store.js (תלוי ב-currentUser ובחנות השמורה).

const ONB_KEY = 'noshop_onboarding';

function onbState() {
  try { return JSON.parse(localStorage.getItem(ONB_KEY) || '{}') || {}; } catch { return {}; }
}
function onbSave(patch) {
  const next = { ...onbState(), ...patch };
  try { localStorage.setItem(ONB_KEY, JSON.stringify(next)); } catch { /* אחסון חסום */ }
  return next;
}
/** סימון שלב שנלמד (סיור שהושלם). */
function onbMark(key) {
  onbSave({ [key]: new Date().toISOString() });
  document.dispatchEvent(new CustomEvent('onboardingChanged'));
}
/** מספר המוצרים שהוגשו - נשמר כדי שדפים בלי קריאת שרת יידעו מה השלב הבא. */
function onbSetProducts(n) {
  const count = Number(n) || 0;
  if (onbState().products_count === count) return;
  onbSave({ products_count: count });
  document.dispatchEvent(new CustomEvent('onboardingChanged'));
}

const ONB_STEPS = [
  { key: 'store', label: 'פתיחת חנות', icon: 'fa-store', href: 'sell.html',
    title: 'פתיחת החנות', text: 'שם, לוגו, טלפון ותיאור, פרטי המוכר וחתימה על הסכם המוכר - פעם אחת בלבד.', cta: 'לפתיחת החנות' },
  { key: 'account', label: 'הרשמה לאתר', icon: 'fa-user-plus', href: 'account.html',
    title: 'הרשמה לאתר', text: 'חשבון שומר את החנות אצלכם (ולא רק בדפדפן הזה), פותח את האזור האישי ואת לוח הבקרה, ומאפשר לנו לעדכן אתכם על הזמנות.', cta: 'הרשמה / התחברות' },
  { key: 'area', label: 'האזור האישי', icon: 'fa-compass', href: 'account.html?tour=1',
    title: 'היכרות עם האזור האישי', text: 'סיור קצר: מאיפה נכנסים, איפה החנות שלכם, איפה ההזמנות ואיפה מעלים מוצר.', cta: 'לאזור האישי' },
  { key: 'product', label: 'המוצר הראשון', icon: 'fa-box-open', href: 'add-product.html',
    title: 'העלאת המוצר הראשון', text: 'תמונות, מחיר, קטגוריה ותיאור. פרטי החנות כבר שמורים - לא ממלאים אותם שוב.', cta: 'להעלאת מוצר' },
  { key: 'dashboard', label: 'לוח הבקרה', icon: 'fa-chart-line', href: 'seller-dashboard.html?tour=1',
    title: 'ניהול החנות מלוח הבקרה', text: 'סיור קצר: מכירות והזמנות, שינוי מחיר ומלאי במקום, והעלמת מוצר מהמדף.', cta: 'ללוח הבקרה' },
  { key: 'design', label: 'עיצוב דף החנות', icon: 'fa-wand-magic-sparkles', href: 'store-designer.html',
    title: 'עיצוב דף החנות', text: 'דף החנות שלכם הוא אתר לכל דבר: באנר, יתרונות, גלריית מוצרים והמלצות. בסטודיו בוחרים סגנון מתוך עשרה, והסיור המודרך מסביר מה נכון לשים בכל מקום.', cta: 'לסטודיו העיצוב' },
];

/** מה כבר נעשה בפועל. */
function onbFacts() {
  const s = onbState();
  const store = typeof getSavedStore === 'function' ? getSavedStore() : null;
  return {
    store: !!store,
    account: !!(typeof currentUser !== 'undefined' && currentUser),
    area: !!s.tour_account,
    product: (Number(s.products_count) || 0) > 0 || !!s.first_product_at,
    dashboard: !!s.tour_dashboard,
    design: !!s.store_design_at,
  };
}
/** השלב שהמוכר נמצא בו עכשיו (הראשון שטרם הושלם), או null כשסיים הכל. */
function onbCurrentKey() {
  const facts = onbFacts();
  return (ONB_STEPS.find(st => !facts[st.key]) || {}).key || null;
}
function onbStep(key) { return ONB_STEPS.find(st => st.key === key) || null; }
/** המסלול רלוונטי רק למי שכבר פתח חנות (או באמצע פתיחתה). */
function onbActive() {
  return onbFacts().store && !!onbCurrentKey();
}

// ---- פס ההתקדמות ----
// מוצג בראש כל דף במסלול. מקבל את מזהה הדף כדי לסמן "אתם כאן" גם כשהשלב
// הנוכחי הוא אחר (למשל מוכר ותיק שנכנס ללוח הבקרה).
function onbRenderBar(container, { here = null } = {}) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return;
  const facts = onbFacts();
  const current = onbCurrentKey();
  if (!facts.store || !current) { el.innerHTML = ''; el.hidden = true; return; }
  const idx = ONB_STEPS.findIndex(st => st.key === current);
  el.hidden = false;
  el.innerHTML = `
    <div class="onb-bar">
      <div class="onb-head">
        <h3><i class="fas fa-route"></i> מסלול פתיחת החנות</h3>
        <span class="onb-count">שלב ${idx + 1} מתוך ${ONB_STEPS.length}</span>
      </div>
      <ol class="onb-steps">
        ${ONB_STEPS.map((st, i) => {
          const done = facts[st.key];
          const isCurrent = st.key === current;
          const cls = done ? 'done' : isCurrent ? 'current' : 'todo';
          const mark = here === st.key ? ' here' : '';
          return `<li class="onb-step ${cls}${mark}">
            <span class="onb-dot"><i class="fas ${done ? 'fa-check' : st.icon}"></i></span>
            <span class="onb-label">${st.label}</span>
            ${here === st.key ? '<span class="onb-youarehere">אתם כאן</span>' : ''}
            ${i < ONB_STEPS.length - 1 ? '<span class="onb-line"></span>' : ''}
          </li>`;
        }).join('')}
      </ol>
    </div>`;
}

// ---- כרטיס "השלב הבא" ----
// skip: שלבים שלא רוצים להציע בדף הזה (למשל בדף שהוא עצמו השלב).
function onbNextCardHtml({ skip = [] } = {}) {
  const key = onbCurrentKey();
  if (!key || skip.includes(key)) return '';
  const st = onbStep(key);
  const stepNum = ONB_STEPS.findIndex(s => s.key === key) + 1;
  const onclick = key === 'account'
    ? ` onclick="openAuth('register');return false"`
    : '';
  return `<div class="onb-next">
    <div class="onb-next-icon"><i class="fas ${st.icon}"></i></div>
    <div class="onb-next-body">
      <span class="onb-next-eyebrow">השלב הבא · ${stepNum} מתוך ${ONB_STEPS.length}</span>
      <strong>${st.title}</strong>
      <p>${st.text}</p>
    </div>
    <a href="${st.href}" class="btn btn-primary btn-lg"${onclick}><i class="fas ${st.icon}"></i> ${st.cta}</a>
  </div>`;
}
function onbRenderNextCard(container, opts) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return;
  const html = onbNextCardHtml(opts);
  el.innerHTML = html;
  el.hidden = !html;
}

// ============================================================
// סיור מודרך - זרקור על אלמנט בדף עם הסבר קצר ליד.
// startTour([{ el, title, text }], { onDone })
// el ריק = בועה במרכז המסך (פתיחה / סיום). אלמנט שלא קיים בדף - מדלגים עליו.
// ============================================================
let tourActive = null;

/** אלמנט שבאמת נראה בדף (לא hidden ולא בתוך מכל מוסתר) - רק עליו מזריחים זרקור */
function tourVisible(el) {
  return !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

function startTour(rawSteps, { onDone = null, onSkip = null } = {}) {
  if (tourActive) return;
  const steps = (rawSteps || []).filter(s => !s.el || tourVisible(document.querySelector(s.el)));
  if (!steps.length) return;

  const ov = document.createElement('div');
  ov.className = 'tour-ov';
  ov.innerHTML = `
    <div class="tour-spot" hidden></div>
    <div class="tour-bubble" role="dialog" aria-live="polite">
      <div class="tour-progress"></div>
      <h4></h4>
      <p></p>
      <div class="tour-actions">
        <button type="button" class="tour-skip">דילוג על הסיור</button>
        <div class="tour-nav">
          <button type="button" class="btn btn-ghost tour-prev">הקודם</button>
          <button type="button" class="btn btn-primary tour-next">הבא</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(ov);

  const spot = ov.querySelector('.tour-spot');
  const bubble = ov.querySelector('.tour-bubble');
  let i = 0;

  function place() {
    const step = steps[i];
    const target = step.el ? document.querySelector(step.el) : null;
    if (!tourVisible(target)) {
      spot.hidden = true;
      ov.classList.add('dim');
      bubble.classList.add('center');
      bubble.style.top = bubble.style.left = '';
      return;
    }
    const r = target.getBoundingClientRect();
    const pad = step.pad ?? 8;
    spot.hidden = false;
    ov.classList.remove('dim');
    spot.style.top = `${r.top - pad}px`;
    spot.style.left = `${r.left - pad}px`;
    spot.style.width = `${r.width + pad * 2}px`;
    spot.style.height = `${r.height + pad * 2}px`;
    bubble.classList.remove('center');
    if (window.innerWidth <= 720) { bubble.style.top = bubble.style.left = ''; return; }
    const bw = bubble.offsetWidth || 340;
    const bh = bubble.offsetHeight || 160;
    const below = r.bottom + 14 + bh <= window.innerHeight - 8;
    const top = below ? r.bottom + 14 : Math.max(8, r.top - bh - 14);
    let left = r.left + r.width / 2 - bw / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - bw - 12));
    bubble.style.top = `${top}px`;
    bubble.style.left = `${left}px`;
  }

  function show() {
    const step = steps[i];
    bubble.querySelector('h4').textContent = step.title || '';
    bubble.querySelector('p').innerHTML = step.text || '';
    bubble.querySelector('.tour-progress').textContent = `${i + 1} / ${steps.length}`;
    bubble.querySelector('.tour-prev').hidden = i === 0;
    bubble.querySelector('.tour-next').innerHTML = i === steps.length - 1
      ? '<i class="fas fa-flag-checkered"></i> סיימנו'
      : 'הבא <i class="fas fa-arrow-left"></i>';
    const target = step.el ? document.querySelector(step.el) : null;
    if (tourVisible(target)) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(place, 320);
    }
    place();
  }

  function close(done) {
    window.removeEventListener('resize', place);
    window.removeEventListener('scroll', place, true);
    document.removeEventListener('keydown', onKey);
    ov.remove();
    tourActive = null;
    if (done) onDone?.();
    else onSkip?.();
  }
  function onKey(e) {
    if (e.key === 'Escape') close(false);
    else if (e.key === 'ArrowLeft') bubble.querySelector('.tour-next').click();
  }

  bubble.querySelector('.tour-next').onclick = () => { if (i < steps.length - 1) { i++; show(); } else close(true); };
  bubble.querySelector('.tour-prev').onclick = () => { if (i > 0) { i--; show(); } };
  bubble.querySelector('.tour-skip').onclick = () => close(false);
  ov.addEventListener('click', e => { if (e.target === ov) bubble.querySelector('.tour-next').click(); });
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, true);
  document.addEventListener('keydown', onKey);

  tourActive = { close };
  show();
}

/** מוריד פרמטר מה-URL בלי לטעון מחדש (כדי שרענון לא יפתח את הסיור שוב). */
function onbStripParam(name) {
  const url = new URL(location.href);
  if (!url.searchParams.has(name)) return;
  url.searchParams.delete(name);
  history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
}
