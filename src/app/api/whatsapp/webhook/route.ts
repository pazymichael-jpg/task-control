import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { query } from "@/lib/db";
import { runAgent, resolvePending, type AgentResult } from "@/lib/agent";
import { defaultChatId, markProcessed, sendWhatsApp } from "@/lib/whatsapp";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const YES = /^(כן|אשר|אישור|מאשר|בטח|סבבה|yes|y|ok|אוקיי|אוקי)[\s!.]*$/i;
const NO = /^(לא|בטל|ביטול|עזוב|no|n|cancel)[\s!.]*$/i;

function format(r: AgentResult) {
  let text = r.reply;
  if (r.pending) text = `${r.pending.text}\n${r.pending.items.slice(0, 8).map((i) => `• ${i}`).join("\n")}${r.pending.items.length > 8 ? `\n…ועוד ${r.pending.items.length - 8}` : ""}\n\nלאישור השב *כן*, לביטול השב *לא*.`;
  return text;
}

async function handle(chatId: string, text: string) {
  try {
    const pend = await query<{ id: string }>(
      "SELECT id FROM pending_actions WHERE channel='whatsapp' AND chat_ref=$1 AND status='pending' AND created_at > now() - interval '30 minutes' ORDER BY created_at DESC LIMIT 1", [chatId]);
    if (pend[0] && (YES.test(text) || NO.test(text))) {
      const r = await resolvePending(pend[0].id, YES.test(text));
      return sendWhatsApp(chatId, format(r));
    }
    if (pend[0]) await query("UPDATE pending_actions SET status='expired' WHERE channel='whatsapp' AND chat_ref=$1 AND status='pending'", [chatId]);
    const r = await runAgent({ history: [{ role: "user", content: text }], scope: "all", channel: "whatsapp", chatRef: chatId });
    await sendWhatsApp(chatId, format(r));
  } catch (e) {
    console.error("whatsapp handle error", e);
    try { await sendWhatsApp(chatId, "משהו השתבש בעיבוד ההודעה. נסה שוב בעוד רגע."); } catch {}
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || req.nextUrl.searchParams.get("secret") !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || body.typeWebhook !== "incomingMessageReceived") return NextResponse.json({ ok: true });

  const chatId: string | undefined = body.senderData?.chatId;
  const allowed = defaultChatId();
  // Only the owner's chat is allowed to control the system.
  if (!chatId || !allowed || chatId !== allowed) return NextResponse.json({ ok: true, ignored: true });
  const md = body.messageData;
  const text: string | undefined = md?.textMessageData?.textMessage ?? md?.extendedTextMessageData?.text;
  if (!text?.trim()) return NextResponse.json({ ok: true });
  if (body.idMessage && !(await markProcessed(body.idMessage))) return NextResponse.json({ ok: true, duplicate: true });

  after(() => handle(chatId, text.trim()));
  return NextResponse.json({ ok: true });
}
