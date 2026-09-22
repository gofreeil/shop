// אמנת המוסר העולמית (UECC) - תנאי סף לפתיחת חנות בקניון השיתופי.
//
// החתימה עצמה נעשית באתר חכמי העדה, והשרת (create של shop-seller-product)
// דוחה כל הגשה של מי שאינו חתום - כך שמוצר של מי שלא חתם לא נוצר כלל ולא
// מגיע להנהלה לאישור. הקובץ הזה הוא הצד של המשתמש: מראה לו את המצב מראש,
// שולח אותו לחתום, ומונע ממנו לשלוח טופס שייכשל ממילא.
//
// שימוש בדף: charterGate.mount('<id של מיכל>', { onChange }) ואז
// charterGate.signed כדי לדעת אם מותר לשלוח.

const CHARTER_SIGN_URL = 'https://chachmim.gofreeil.com/heichal-hamaaseh/ethical-code';

const charterGate = {
  signed: false,
  guest: true,
  signature: null,
  signUrl: CHARTER_SIGN_URL,
  loaded: false,
  _box: null,
  _onChange: null,

  mount(containerId, { onChange } = {}) {
    this._box = document.getElementById(containerId);
    this._onChange = onChange || null;
    if (!this._box) return;
    this._box.className = 'charter-gate loading';
    this._box.innerHTML = '<i class="fas fa-spinner fa-spin"></i> בודקים את החתימה על אמנת המוסר...';
    this.refresh();
    // חוזרים מהחתימה בלשונית אחרת - בודקים שוב כשחוזרים לדף
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !this.signed) this.refresh(); });
    document.addEventListener('userChanged', () => this.refresh());
  },

  async refresh() {
    try {
      const r = await fetch('/api/charter');
      const d = await r.json();
      this.signed = !!d.signed;
      this.guest = !!d.guest;
      this.signature = d.signature || null;
      this.signUrl = d.signUrl || CHARTER_SIGN_URL;
    } catch {
      this.signed = false;
    }
    this.loaded = true;
    this.render();
    if (this._onChange) this._onChange(this.signed);
  },

  render() {
    const box = this._box;
    if (!box) return;
    if (this.signed) {
      const when = this.signature?.signedDate ? ` ב-${new Date(this.signature.signedDate).toLocaleDateString('he-IL')}` : '';
      box.className = 'charter-gate signed';
      box.innerHTML = `<div><i class="fas fa-circle-check"></i> <strong>חתומים על אמנת המוסר העולמית (UECC)</strong>${this.signature?.name ? ` · ${escapeCharter(this.signature.name)}` : ''}${when}. אפשר להמשיך.</div>`;
      return;
    }
    box.className = 'charter-gate';
    box.innerHTML = `
      <div>
        <strong><i class="fas fa-scale-balanced"></i> חובה: חתימה על אמנת המוסר העולמית (UECC)</strong>
        <p>כל בעל חנות בקניון חתום על אמנת המוסר העולמית של חכמי העדה - יושר מול הלקוח, אחריות על מה שמכרתם ונכונות להישפט בבתי הפיוס. ${this.guest ? 'התחברו לחשבון, ואז חתמו על האמנה' : 'החתימה נעשית באתר חכמי העדה, עם אותו אימייל של החשבון שלכם'}.</p>
        <p class="charter-gate-note">בלי החתימה החנות לא נפתחת וההגשה לא מגיעה להנהלה לאישור.</p>
        <div class="charter-gate-actions">
          ${this.guest ? '<button type="button" class="btn btn-primary" onclick="openAuth(\'login\')"><i class="fas fa-user"></i> התחברות</button>' : ''}
          <a href="${this.signUrl}" target="_blank" rel="noopener" class="btn ${this.guest ? 'btn-ghost' : 'btn-primary'}"><i class="fas fa-file-signature"></i> לקריאת האמנה ולחתימה</a>
          <button type="button" class="btn btn-ghost" onclick="charterGate.refresh()"><i class="fas fa-rotate"></i> כבר חתמתי - בדיקה מחדש</button>
        </div>
      </div>`;
  },

  // הודעת השגיאה שמוצגת כשמנסים לשלוח בלי חתימה
  blockMessage() {
    return this.guest
      ? 'כדי לפתוח חנות צריך להתחבר לחשבון ולחתום על אמנת המוסר העולמית (UECC).'
      : 'כדי לפתוח חנות צריך לחתום על אמנת המוסר העולמית (UECC) - הקישור לחתימה נמצא למעלה. אחרי החתימה לחצו "כבר חתמתי - בדיקה מחדש".';
  },
};

function escapeCharter(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
