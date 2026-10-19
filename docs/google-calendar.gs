// Task Control → Google Calendar
// Paste into a new project at https://script.google.com, set SECRET, then Deploy → New deployment → Web app
// (Execute as: Me, Who has access: Anyone). Put the /exec URL and the SECRET in Vercel.

const SECRET = 'CHANGE-ME'; // same value as GOOGLE_SCRIPT_SECRET in Vercel
const TZ = 'Asia/Jerusalem';
const DURATION_MIN = 60;

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    if (req.secret !== SECRET) return out({ error: 'unauthorized' });
    const cal = CalendarApp.getDefaultCalendar();
    const existing = req.id ? cal.getEventById(req.id) : null;

    if (req.action === 'delete') {
      if (existing) existing.deleteEvent();
      return out({ ok: true });
    }
    if (req.action === 'upsert') {
      const start = Utilities.parseDate(req.date + ' ' + req.time, TZ, 'yyyy-MM-dd HH:mm');
      const end = new Date(start.getTime() + DURATION_MIN * 60 * 1000);
      if (existing) {
        existing.setTitle(req.title);
        existing.setDescription(req.description || '');
        existing.setTime(start, end);
        return out({ id: existing.getId() });
      }
      const ev = cal.createEvent(req.title, start, end, { description: req.description || '' });
      return out({ id: ev.getId() });
    }
    return out({ error: 'unknown action' });
  } catch (err) {
    return out({ error: String(err) });
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Run this once from the editor to grant calendar access before deploying.
function authorize() {
  CalendarApp.getDefaultCalendar().getName();
}
