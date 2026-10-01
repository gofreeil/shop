// שחזור גישה לחשבון בחנות: דפי forgot-password.html ו-reset-password.html.
// השרת עצמו (api/login.js?forgot / ?reset) מדבר עם ה-Strapi המשותף של רשת האתרים.
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  async function post(query, payload) {
    const res = await fetch('/api/login?' + query + '=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  // ───────────── שכחתי סיסמה ─────────────
  function initForgot() {
    const form = $('forgotForm');
    const emailInput = $('email');
    const errBox = $('formError');
    const submit = $('submitBtn');
    const params = new URLSearchParams(location.search);
    const pre = (params.get('email') || '').trim();
    if (EMAIL_RE.test(pre)) emailInput.value = pre;

    // השרת מגביל לשליחה אחת ל-45 שניות לכתובת; מעט מעל כדי שהלחיצה החוזרת תמיד תשלח.
    const COOLDOWN = 50;
    let timer = null;
    let sentTo = '';

    const MAIL_APPS = {
      'gmail.com': ['Gmail', 'https://mail.google.com/'],
      'googlemail.com': ['Gmail', 'https://mail.google.com/'],
      'outlook.com': ['Outlook', 'https://outlook.live.com/mail/'],
      'hotmail.com': ['Outlook', 'https://outlook.live.com/mail/'],
      'live.com': ['Outlook', 'https://outlook.live.com/mail/'],
      'yahoo.com': ['Yahoo Mail', 'https://mail.yahoo.com/'],
      'walla.co.il': ['וואלה מייל', 'https://mail.walla.co.il/'],
      'walla.com': ['וואלה מייל', 'https://mail.walla.co.il/']
    };

    function showError(msg) {
      errBox.textContent = msg;
      errBox.hidden = !msg;
    }

    function startCooldown() {
      const btn = $('resendBtn');
      let left = COOLDOWN;
      clearInterval(timer);
      const tick = () => {
        if (left > 0) {
          btn.disabled = true;
          btn.textContent = 'שליחה חוזרת בעוד ' + left + ' שנ\'';
          left -= 1;
        } else {
          clearInterval(timer);
          btn.disabled = false;
          btn.textContent = 'לא הגיע? שלחו שוב';
        }
      };
      tick();
      timer = setInterval(tick, 1000);
    }

    function showSent(email) {
      sentTo = email;
      $('askView').hidden = true;
      $('sentView').hidden = false;
      $('sentAddr').textContent = email;
      const app = MAIL_APPS[(email.split('@')[1] || '').toLowerCase()];
      const link = $('mailApp');
      if (app) {
        link.href = app[1];
        link.textContent = 'פתיחת ' + app[0] + ' ↗';
        link.hidden = false;
      } else {
        link.hidden = true;
      }
      $('resendError').hidden = true;
      startCooldown();
    }

    async function send(email, resend) {
      const btn = resend ? $('resendBtn') : submit;
      const label = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'שולח…';
      if (resend) $('resendError').hidden = true;
      else showError('');
      try {
        const r = await post('forgot', { email });
        if (r.ok) return showSent(email);
        const msg =
          r.status === 429
            ? 'ביקשתם יותר מדי פעמים. נסו שוב בעוד כמה דקות.'
            : r.data && r.data.error === 'bad_email'
              ? 'כתובת האימייל לא נראית תקינה. בדקו שהקלדתם אותה נכון.'
              : 'תקלה זמנית בשליחת המייל. נסו שוב בעוד רגע.';
        if (resend) {
          $('resendError').textContent = msg;
          $('resendError').hidden = false;
        } else showError(msg);
      } catch (e) {
        const msg = 'תקלה זמנית בשליחת המייל. נסו שוב בעוד רגע.';
        if (resend) {
          $('resendError').textContent = msg;
          $('resendError').hidden = false;
        } else showError(msg);
      }
      btn.disabled = false;
      btn.textContent = label;
      if (resend) startCooldown();
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = emailInput.value.trim();
      if (!EMAIL_RE.test(email)) return showError('כתובת האימייל לא נראית תקינה. בדקו שהקלדתם אותה נכון.');
      send(email, false);
    });
    $('resendBtn').addEventListener('click', () => send(sentTo, true));
    $('fixAddr').addEventListener('click', (e) => {
      e.preventDefault();
      clearInterval(timer);
      $('sentView').hidden = true;
      $('askView').hidden = false;
      emailInput.value = sentTo;
      emailInput.focus();
    });
    emailInput.focus();
  }

  // ───────────── בחירת סיסמה חדשה ─────────────
  function initReset() {
    const code = (new URLSearchParams(location.search).get('code') || '').trim();
    const form = $('resetForm');
    const pw = $('password');
    const cf = $('confirm');
    const errBox = $('formError');
    const submit = $('submitBtn');

    function showInvalid(msg) {
      $('formView').hidden = true;
      $('invalidView').hidden = false;
      if (msg) $('invalidMsg').textContent = msg;
    }
    if (!code) return showInvalid('הקישור חסר או לא תקין.');

    function showError(msg) {
      errBox.textContent = msg;
      errBox.hidden = !msg;
    }

    const LABELS = ['', 'חלשה', 'סבירה', 'טובה', 'חזקה'];
    function strengthOf(p) {
      if (!p) return 0;
      let s = 0;
      if (p.length >= 6) s++;
      if (p.length >= 10) s++;
      if (/[a-zא-ת]/i.test(p) && /\d/.test(p)) s++;
      if (/[^a-zA-Z0-9א-ת]/.test(p) || (/[A-Z]/.test(p) && /[a-z]/.test(p))) s++;
      return Math.min(s, 4);
    }

    function refresh() {
      const level = strengthOf(pw.value);
      $('meter').hidden = !pw.value;
      $('bars').setAttribute('data-level', String(level));
      $('meterLabel').textContent = LABELS[level];
      const mismatch = cf.value.length > 0 && pw.value !== cf.value;
      $('mismatch').hidden = !mismatch;
      submit.disabled = !(pw.value.length >= 6 && pw.value === cf.value);
    }
    pw.addEventListener('input', refresh);
    cf.addEventListener('input', refresh);

    $('toggleShow').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      const show = pw.type === 'password';
      pw.type = cf.type = show ? 'text' : 'password';
      btn.textContent = show ? 'הסתר' : 'הצג';
      btn.setAttribute('aria-pressed', String(show));
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showError('');
      if (pw.value.length < 6) return showError('הסיסמה צריכה להכיל לפחות 6 תווים.');
      if (pw.value !== cf.value) return showError('שתי הסיסמאות לא זהות. נסו שוב.');
      submit.disabled = true;
      submit.textContent = 'שומר…';
      try {
        const r = await post('reset', { code, password: pw.value });
        if (r.ok && r.data.user) {
          // העוגייה המשותפת כבר נשתלה בשרת; שומרים גם את המשתמש כדי שהכותרת תתעדכן מיד.
          try { localStorage.setItem('noshop_user', JSON.stringify(r.data.user)); } catch (_) { /* חסום */ }
          $('formView').hidden = true;
          $('doneView').hidden = false;
          setTimeout(() => { location.href = '/'; }, 1200);
          return;
        }
        if (r.data && r.data.error === 'expired') return showInvalid('הקישור כבר נוצל או שפג תוקפו (הוא תקף לשעתיים).');
        showError(
          r.status === 429
            ? 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.'
            : 'תקלה זמנית בשרת. נסו שוב בעוד רגע.'
        );
      } catch (err) {
        showError('תקלה זמנית בשרת. נסו שוב בעוד רגע.');
      }
      submit.textContent = 'שמירת הסיסמה והתחברות';
      refresh();
    });

    refresh();
    pw.focus();
  }

  const page = document.body.dataset.page;
  if (page === 'forgot') initForgot();
  else if (page === 'reset') initReset();
})();
