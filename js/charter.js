// אמנת המוסר העולמית (UECC) - תנאי סף לפתיחת חנות בקניון השיתופי.
//
// החתימה נעשית כאן, בתוך הדף, בלי לצאת לאתר אחר: POST /api/charter רושם אותה
// במאגר החתימות של חכמי העדה (אותו מאגר שהאתר שם מציג ברשומות החותמים), עם
// האימייל של החשבון - כך השם מופיע שם, והשרת (create של shop-seller-product)
// מזהה את החותם מיד. הקובץ הזה הוא הצד של המשתמש: מראה את המצב, מציג את נוסח
// האמנה ומאפשר לחתום.
//
// שימוש בדף: charterGate.mount('<id של מיכל>', { onChange, defaults }) ואז
// charterGate.signed כדי לדעת אם חתום. defaults() מחזיר { name, city, phone,
// businessName } למילוי מראש של החתימה (למשל מטופס החנות).

const CHARTER_SIGN_URL = 'https://chachmim.gofreeil.com/heichal-hamaaseh/ethical-code';
const CHARTER_INDEX_URL = 'https://chachmim.gofreeil.com/charter-index';

// נוסח האמנה - כפי שהוא מופיע באתר חכמי העדה (charter_text_full)
const CHARTER_TEXT = `מקור הסמכות: אני מאמין / יודע / מעיד שהקדוש ברוך הוא התגלה במעמד הר סיני ונתן לעם ישראל ולכל העולם את עקרונות האמת והצדק.

הריני מתחייב ומקבל על עצמי לקיים את דברי האמנה וכלליה בהתחייבות כלפי א-להים ואדם.

אני מתחייב לעשות הישר והטוב בעיני ה', הישר הוא שכל מה שאני אומר אני מתכוון לעשותו ואיני מרמה בדיבורי. בכל עסקה שאשתתף, הריני מתחייב לקיימה ברגע שאתחייב על פי דרכי הקנין הנהוגות כגון תקיעת כף, חתימת חוזה והעברת בעלות.

הטוב בעיני ה' הוא שאדאג לצרכים של זולתי במידת יכולתי, ואדאג לטוב של שותפי. בכל עסקה אוודא כי כל הצדדים יצאו מרוויחים ולא ניזוקים. כמעביד, אדאג לזכויות עובדי השכירים, אקדם אותם כמידת יכולתי ואשלם את שכרם בזמנו. כעובד אדאג בנאמנות לבצע את עבודתי לטובת המעסיק והעסק ולמנוע מהם כל נזק. כנותן שירות אדאג לספק ללקוח את המיטב שאוכל לתת לו. כשוכר את שירותיו של אדם אשלם את שכרו בזמן.

אני מתחייב לקיים את המינימום הנדרש על ידי בורא עולם מכל בני האדם כפי שבורא עולם אמר למשה רבנו בהר סיני:

א. איסור לעבוד עבודה זרה
ב. איסור לגדף חלילה את שמו של הבורא
ג. איסור לרצוח
ד. איסור לנאוף
ה. איסור לגזול
ו. איסור לאכול אבר מן החי
ז. אני מתחייב שכל מחלוקת או אי הסכמה ביני ובין אחרים אשתדל לפתור מתוך כבוד הדדי, ואם הדבר לא יעלה בידי אפנה לבתי הפיוס המוסכמים.

אני מסכים שהתחייבות זו תפורסם ברשומות כך שכל איש עסקים, עובד או מעביד, יוכל לראות את התחייבותי זו.

ובזאת באתי על החתום:`;

const charterGate = {
  signed: false,
  error: false,
  guest: true,
  signature: null,
  signUrl: CHARTER_SIGN_URL,
  indexUrl: CHARTER_INDEX_URL,
  loaded: false,
  justSigned: false,
  signing: false,
  // מה שהמשתמש כבר הקליד בטופס החתימה - נשמר בין רינדורים (למשל כשהוא מתחבר באמצע)
  draft: { name: '', accepted: false },
  _box: null,
  _onChange: null,
  _defaults: null,

  mount(containerId, { onChange, defaults } = {}) {
    this._box = document.getElementById(containerId);
    this._onChange = onChange || null;
    this._defaults = defaults || null;
    if (!this._box) return;
    this._box.className = 'charter-gate loading';
    this._box.innerHTML = '<i class="fas fa-spinner fa-spin"></i> בודקים את החתימה על אמנת המוסר...';
    this.refresh();
    // אולי חתם בלשונית אחרת (באתר חכמי העדה) - בודקים שוב כשחוזרים לדף
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !this.signed) this.refresh(); });
    document.addEventListener('userChanged', () => this.refresh());
  },

  async refresh() {
    try {
      const r = await fetch('/api/charter');
      const d = await r.json();
      this.signed = !!d.signed;
      this.error = !!d.error;
      this.guest = !!d.guest;
      this.signature = d.signature || null;
      this.signUrl = d.signUrl || CHARTER_SIGN_URL;
      this.indexUrl = d.indexUrl || CHARTER_INDEX_URL;
    } catch {
      this.signed = false;
      this.error = true;
    }
    this.loaded = true;
    this.render();
    if (this._onChange) this._onChange(this.signed);
  },

  defaults() {
    let d = {};
    try { d = (this._defaults && this._defaults()) || {}; } catch { /* ignore */ }
    if (!d.name && typeof currentUser !== 'undefined' && currentUser?.name) d.name = currentUser.name;
    return d;
  },

  // האם המשתמש סימן שהוא חותם (לשימוש הדף: אורח שחותם יחד עם שליחת הטופס)
  wantsToSign() {
    return !this.signed && this.draft.accepted && !!(this.draft.name || this.defaults().name || '').trim();
  },

  // חתימה בפועל - נרשמת בחכמי העדה עם האימייל של החשבון. דורש התחברות.
  async sign() {
    if (this.signed) return true;
    const d = this.defaults();
    const name = (this.draft.name || d.name || '').trim();
    if (!name) throw new Error('יש למלא שם מלא לחתימה על האמנה');
    if (!this.draft.accepted) throw new Error('יש לסמן שקראתם ואתם מקבלים את האמנה');
    this.signing = true;
    this.render();
    try {
      const r = await fetch('/api/charter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, city: d.city || '', phone: d.phone || '', businessName: d.businessName || '', accepted: true }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'החתימה לא נשמרה. נסו שוב.');
      this.signed = true;
      this.error = false;
      this.justSigned = true;
      this.signature = j.signature || { name, signedDate: new Date().toISOString() };
      if (j.indexUrl) this.indexUrl = j.indexUrl;
      if (typeof toast === 'function') toast('חתמתם על אמנת המוסר - שמכם נוסף לרשומות החותמים', 'fa-file-signature');
      return true;
    } finally {
      this.signing = false;
      this.render();
      if (this._onChange) this._onChange(this.signed);
    }
  },

  async signFromButton() {
    const msg = this._box?.querySelector('.charter-sign-msg');
    try {
      if (this.guest) { if (typeof openAuth === 'function') openAuth('register'); return; }
      await this.sign();
    } catch (ex) {
      if (msg) { msg.textContent = ex.message; msg.hidden = false; }
    }
  },

  render() {
    const box = this._box;
    if (!box) return;
    if (this.signed) {
      const when = this.signature?.signedDate ? ` ב-${new Date(this.signature.signedDate).toLocaleDateString('he-IL')}` : '';
      const who = this.signature?.name ? ` · ${escapeCharter(this.signature.name)}` : '';
      box.className = 'charter-gate signed';
      box.innerHTML = this.justSigned
        ? `<div><i class="fas fa-circle-check"></i> <strong>חתמתם על אמנת המוסר העולמית (UECC)${who}.</strong><br>
            שמכם נוסף לרשומות החותמים על האמנה באתר חכמי העדה - כל לקוח ובעל עסק יכול לראות את ההתחייבות שלכם.
            <a href="${this.indexUrl}" target="_blank" rel="noopener" style="text-decoration:underline">לרשומות החותמים</a></div>`
        : `<div><i class="fas fa-circle-check"></i> <strong>חתומים על אמנת המוסר העולמית (UECC)</strong>${who}${when}. אפשר להמשיך.
            <a href="${this.indexUrl}" target="_blank" rel="noopener" style="text-decoration:underline">לרשומות החותמים</a></div>`;
      return;
    }
    if (this.error) {
      // הבדיקה עצמה נכשלה - לא אומרים למוכר שהוא לא חתום, כי ייתכן שכן
      box.className = 'charter-gate';
      box.innerHTML = `
        <div>
          <strong><i class="fas fa-triangle-exclamation"></i> לא הצלחנו לבדוק כרגע את החתימה על אמנת המוסר</strong>
          <p>זו תקלה זמנית אצלנו, לא אצלכם. אם כבר חתמתם - לחצו "בדיקה מחדש" בעוד רגע.</p>
          <div class="charter-gate-actions">
            <button type="button" class="btn btn-primary" onclick="charterGate.refresh()"><i class="fas fa-rotate"></i> בדיקה מחדש</button>
          </div>
        </div>`;
      return;
    }
    // לא חתום: נוסח האמנה + שם + אישור, והחתימה נעשית כאן
    const name = this.draft.name || this.defaults().name || '';
    box.className = 'charter-gate';
    box.innerHTML = `
      <div style="flex:1;min-width:0">
        <strong><i class="fas fa-scale-balanced"></i> חתימה על אמנת המוסר העולמית (UECC)</strong>
        <p>כל בעל חנות בקניון חתום על אמנת המוסר של חכמי העדה - יושר מול הלקוח, אחריות על מה שמכרתם ונכונות להישפט בבתי הפיוס. חותמים כאן, בלי לצאת מהדף, ושמכם יופיע ברשומות החותמים על האמנה באתר חכמי העדה.</p>
        <div class="charter-text">${escapeCharter(CHARTER_TEXT)}</div>
        <div class="form-field" style="margin-top:10px">
          <label>שם מלא לחתימה (יופיע ברשומות החותמים) *</label>
          <input type="text" maxlength="120" class="charter-name" value="${escapeCharter(name)}" oninput="charterGate.draft.name=this.value">
        </div>
        <label class="consent" style="margin-top:8px">
          <input type="checkbox" class="charter-accept" ${this.draft.accepted ? 'checked' : ''} onchange="charterGate.draft.accepted=this.checked">
          <span><strong>קראתי את האמנה ואני מקבל/ת אותה על עצמי</strong>
          ומסכים/ה ששמי יפורסם ברשומות החותמים על האמנה.</span>
        </label>
        <p class="charter-sign-msg" style="color:#b91c1c;font-weight:600;margin-top:8px" hidden></p>
        <div class="charter-gate-actions">
          ${this.guest
            ? '<span style="font-size:13px;color:var(--text-muted)">החתימה תירשם אוטומטית עם שליחת הטופס (שפותחת לכם חשבון).</span>'
            : `<button type="button" class="btn btn-primary" onclick="charterGate.signFromButton()" ${this.signing ? 'disabled' : ''}>${this.signing ? '<i class="fas fa-spinner fa-spin"></i> חותם...' : '<i class="fas fa-file-signature"></i> חתימה על האמנה'}</button>`}
          <button type="button" class="btn btn-ghost" onclick="charterGate.refresh()"><i class="fas fa-rotate"></i> כבר חתמתי - בדיקה מחדש</button>
        </div>
      </div>`;
  },

  // הודעת השגיאה שמוצגת כשמנסים לשלוח בלי חתימה
  blockMessage() {
    if (this.error) return 'לא הצלחנו לבדוק כרגע את החתימה על אמנת המוסר - תקלה זמנית אצלנו. לחצו "בדיקה מחדש" בתיבה שלמעלה, או נסו שוב בעוד כמה דקות.';
    return this.guest
      ? 'כדי לפתוח חנות צריך להתחבר לחשבון ולחתום על אמנת המוסר העולמית (UECC).'
      : 'כדי להמשיך צריך לחתום על אמנת המוסר העולמית (UECC) - בתיבת האמנה שלמעלה: ממלאים שם, מסמנים ולוחצים "חתימה על האמנה".';
  },
};

function escapeCharter(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
