import { query } from "./db";
import { listSpaces, listTasks } from "./tasks";
import { formatDateHe, formatShort, todayStr } from "./dates";
import { PRIORITY_META, STATUS_META, type Task } from "./constants";

const GREEN_TOKEN = () => process.env.GREEN_API_TOKEN || process.env.GREEN_API_TOKEN_INSTANCE;

export function whatsappConfigured() {
  return !!(process.env.GREEN_API_ID_INSTANCE && GREEN_TOKEN());
}
export function defaultChatId(): string | null {
  const c = process.env.WHATSAPP_CHAT_ID?.trim();
  if (!c) return null;
  return c.includes("@") ? c : `${c.replace(/\D/g, "")}@c.us`;
}

export async function sendWhatsApp(chatId: string, message: string) {
  const base = (process.env.GREEN_API_URL || "https://api.green-api.com").replace(/\/$/, "");
  const url = `${base}/waInstance${process.env.GREEN_API_ID_INSTANCE}/sendMessage/${GREEN_TOKEN()}`;
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chatId, message }) });
  if (!r.ok) throw new Error(`Green API ${r.status}: ${await r.text()}`);
  return r.json();
}

const line = (t: Task, today: string, showDate = true) => {
  const p = t.priority === "urgent" ? "🔴 " : t.priority === "high" ? "🟠 " : "";
  const d = showDate && t.due_date ? ` _(${t.due_date < today ? "באיחור מאז " : ""}${formatShort(t.due_date)})_` : "";
  return `• ${p}${t.title}${d}`;
};

export async function buildMorningSummary(): Promise<string> {
  const today = todayStr();
  const [spaces, tasks] = await Promise.all([listSpaces(), listTasks()]);
  const open = tasks.filter((t) => t.status !== "done");
  const rank = (t: Task) => PRIORITY_META[t.priority].rank;
  const out: string[] = [`☀️ *בוקר טוב!*`, `${formatDateHe(today, true)} · ${open.length} משימות פתוחות`];
  let any = false;
  for (const s of spaces) {
    const mine = open.filter((t) => t.space_id === s.id);
    const overdue = mine.filter((t) => t.due_date && t.due_date < today).sort((a, b) => rank(b) - rank(a));
    const todays = mine.filter((t) => t.due_date === today).sort((a, b) => rank(b) - rank(a));
    const urgent = mine.filter((t) => t.priority === "urgent" && !overdue.includes(t) && !todays.includes(t));
    if (!overdue.length && !todays.length && !urgent.length) continue;
    any = true;
    out.push("", `*${s.name}* — ${mine.length} פתוחות`);
    if (overdue.length) out.push(`⏰ באיחור (${overdue.length}):`, ...overdue.map((t) => line(t, today)));
    if (todays.length) out.push(`📅 להיום (${todays.length}):`, ...todays.map((t) => line(t, today, false)));
    if (urgent.length) out.push(`🚨 דחוף (${urgent.length}):`, ...urgent.map((t) => line(t, today)));
  }
  if (!any) out.push("", "אין משימות דחופות, להיום או באיחור. יום רגוע 🎉");
  out.push("", "אפשר להשיב לי כאן כדי להוסיף משימות, למשל: _תוסיף לבית: לקנות חלב מחר_");
  return out.join("\n");
}

export async function markProcessed(id: string): Promise<boolean> {
  const r = await query("INSERT INTO processed_messages(id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id", [id]);
  return r.length > 0;
}
export { STATUS_META };
