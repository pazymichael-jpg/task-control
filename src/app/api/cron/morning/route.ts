import { NextRequest, NextResponse } from "next/server";
import { COOKIE, verifyToken } from "@/lib/auth";
import { buildMorningSummary, defaultChatId, sendWhatsApp, whatsappConfigured } from "@/lib/whatsapp";
import { israelHour, todayStr } from "@/lib/dates";
import { getSetting, setSetting } from "@/lib/tasks";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization");
  const cronOk = !!process.env.CRON_SECRET && bearer === `Bearer ${process.env.CRON_SECRET}`;
  const sessionOk = await verifyToken(req.cookies.get(COOKIE)?.value);
  if (!cronOk && !sessionOk) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const manual = sessionOk && !cronOk; // manual test from a logged-in browser: ?preview=1 returns text only
  if (!whatsappConfigured() || !defaultChatId()) {
    return NextResponse.json({ ok: false, error: "WhatsApp לא מוגדר (GREEN_API_ID_INSTANCE / GREEN_API_TOKEN / WHATSAPP_CHAT_ID)", preview: req.nextUrl.searchParams.has("preview") ? await buildMorningSummary() : undefined });
  }
  if (req.nextUrl.searchParams.has("preview")) return NextResponse.json({ preview: await buildMorningSummary() });

  const today = todayStr();
  if (!manual) {
    // Vercel cron runs in UTC; two schedules cover summer/winter time. Send only at the configured Israel hour, once per day.
    const hour = Number(process.env.MORNING_HOUR ?? 7);
    if (israelHour() !== hour) return NextResponse.json({ ok: true, skipped: "not the morning hour" });
    if ((await getSetting<string>("last_morning_summary")) === today) return NextResponse.json({ ok: true, skipped: "already sent" });
  }
  await sendWhatsApp(defaultChatId()!, await buildMorningSummary());
  if (!manual) await setSetting("last_morning_summary", today);
  return NextResponse.json({ ok: true, sent: true });
}
