// Google Calendar via a Google Apps Script web app deployed from the owner's own account
// (see docs/google-calendar.gs). The script runs as the owner, so no Google Cloud project is needed.
// Env: GOOGLE_SCRIPT_URL (the /exec deployment URL), GOOGLE_SCRIPT_SECRET (same value as SECRET in the script).

export const calendarConfigured = () => !!(process.env.GOOGLE_SCRIPT_URL && process.env.GOOGLE_SCRIPT_SECRET);

async function call(body: Record<string, unknown>): Promise<{ id?: string }> {
  // Apps Script answers POST with a redirect to the result; fetch follows it.
  const r = await fetch(process.env.GOOGLE_SCRIPT_URL!, {
    method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ secret: process.env.GOOGLE_SCRIPT_SECRET, ...body }),
  });
  const text = await r.text();
  let j: any;
  try { j = JSON.parse(text); } catch { throw new Error(`Google script ${r.status}: ${text.slice(0, 200)}`); }
  if (j.error) throw new Error(`Google script: ${j.error}`);
  return j;
}

export type CalTask = { title: string; description: string; due_date: string; due_time: string; space: string };

/** Creates or updates the event; returns its id. */
export async function upsertEvent(eventId: string | null, t: CalTask): Promise<string | null> {
  if (!calendarConfigured()) return null;
  const r = await call({
    action: "upsert", id: eventId, title: t.title,
    description: [t.space && `מרחב: ${t.space}`, t.description].filter(Boolean).join("\n"),
    date: t.due_date, time: t.due_time,
  });
  return r.id ?? null;
}

export async function deleteEvent(eventId: string | null) {
  if (!eventId || !calendarConfigured()) return;
  await call({ action: "delete", id: eventId });
}
