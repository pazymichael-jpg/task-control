import OpenAI from "openai";
import { query } from "./db";
import { listSpaces, listTasks, createTask, updateTask, deleteTasks } from "./tasks";
import { addDays, formatDateHe, todayStr, WEEKDAYS_HE, weekdayOf, weekStart } from "./dates";
import { PRIORITIES, PRIORITY_META, STATUSES, STATUS_META, type Priority, type Space, type Status, type Task } from "./constants";

export type Scope = string; // "all" or a space id
export type ChatMsg = { role: "user" | "assistant"; content: string };
export type PendingInfo = { id: string; text: string; count: number; items: string[] };
export type AgentResult = { reply: string; mutated: boolean; actions: string[]; pending?: PendingInfo };

const CONFIRM_OVER = 3;

function client() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
function model() {
  return (process.env.OPENAI_MODEL || "gpt-6-luna").replace(/^openai\//, "");
}

/* ----------------------------- tool schemas ----------------------------- */
const filterSchema = {
  type: "object",
  description: "סינון משימות. שדות שלא נשלחו לא מסננים. ללא סינון בכלל = כל המשימות הפתוחות בתחום העבודה.",
  properties: {
    space: { type: "string", description: "שם מרחב (רק בתוך תחום העבודה)" },
    status: { type: "array", items: { type: "string", enum: [...STATUSES] } },
    priority: { type: "array", items: { type: "string", enum: [...PRIORITIES] } },
    overdue: { type: "boolean", description: "רק משימות באיחור (תאריך יעד עבר ולא הושלמו)" },
    due_on: { type: "string", description: "YYYY-MM-DD, תאריך יעד מדויק" },
    due_from: { type: "string", description: "YYYY-MM-DD" },
    due_to: { type: "string", description: "YYYY-MM-DD" },
    no_due_date: { type: "boolean", description: "רק משימות בלי תאריך יעד" },
    text: { type: "string", description: "חיפוש טקסט בכותרת" },
    include_done: { type: "boolean", description: "לכלול גם משימות שהושלמו (ברירת מחדל: לא, אלא אם סטטוס done צוין)" },
  },
};
const selectorProps = {
  task_ids: { type: "array", items: { type: "string" }, description: "מזהי משימות ספציפיים (מתוך read_tasks)" },
  filter: filterSchema,
};
export const TOOLS: any[] = [
  { type: "function", function: { name: "read_tasks", description: "קריאת משימות לפי סינון. מחזיר רשימת משימות.", parameters: { type: "object", properties: { filter: filterSchema, limit: { type: "integer" } } } } },
  { type: "function", function: { name: "add_tasks", description: "הוספת משימה אחת או יותר.", parameters: { type: "object", required: ["tasks"], properties: { tasks: { type: "array", items: { type: "object", required: ["title"], properties: {
    title: { type: "string" }, space: { type: "string", description: "שם המרחב. אם בתחום עבודה של מרחב אחד אפשר להשמיט." },
    priority: { type: "string", enum: [...PRIORITIES] }, status: { type: "string", enum: [...STATUSES] },
    due_date: { type: "string", description: "YYYY-MM-DD" }, description: { type: "string" } } } } } } } },
  { type: "function", function: { name: "update_tasks", description: "עדכון משימות לפי מזהים או סינון: סטטוס, עדיפות, תאריך יעד, כותרת או מרחב.", parameters: { type: "object", required: ["changes"], properties: { ...selectorProps, changes: { type: "object", properties: {
    status: { type: "string", enum: [...STATUSES] }, priority: { type: "string", enum: [...PRIORITIES] },
    due_date: { type: ["string", "null"], description: "YYYY-MM-DD, או null להסרת תאריך" }, title: { type: "string" }, space: { type: "string", description: "שם מרחב יעד להעברה" } } } } } } },
  { type: "function", function: { name: "delete_tasks", description: "מחיקת משימות לפי מזהים או סינון.", parameters: { type: "object", properties: selectorProps } } },
  { type: "function", function: { name: "summarize_tasks", description: "סיכום סטטיסטי: ספירות לפי מרחב/סטטוס/עדיפות, באיחור, להיום, דחוף, והמשימות החשובות ביותר.", parameters: { type: "object", properties: { space: { type: "string" } } } } },
];

/* ------------------------------ helpers -------------------------------- */
type Ctx = { scope: Scope; spaces: Space[]; inScope: Space[]; today: string };

async function loadCtx(scope: Scope): Promise<Ctx> {
  const spaces = await listSpaces();
  const inScope = scope === "all" ? spaces : spaces.filter((s) => s.id === scope);
  return { scope, spaces, inScope, today: todayStr() };
}
function findSpace(ctx: Ctx, name?: string): Space | { error: string } | undefined {
  if (!name) return undefined;
  const n = name.trim().toLowerCase();
  const hit = ctx.inScope.find((s) => s.name.toLowerCase() === n) ?? ctx.inScope.filter((s) => s.name.toLowerCase().includes(n) || n.includes(s.name.toLowerCase()))[0];
  if (hit) return hit;
  return { error: `המרחב "${name}" לא נמצא בתחום העבודה. מרחבים זמינים: ${ctx.inScope.map((s) => s.name).join(", ")}` };
}
const isErr = (x: any): x is { error: string } => x && typeof x === "object" && "error" in x;

function tview(t: Task, ctx: Ctx) {
  return { id: t.id, title: t.title, space: ctx.spaces.find((s) => s.id === t.space_id)?.name, priority: PRIORITY_META[t.priority].label + ` (${t.priority})`, status: STATUS_META[t.status].label + ` (${t.status})`, due_date: t.due_date, overdue: !!t.due_date && t.due_date < ctx.today && t.status !== "done" };
}

async function matchTasks(ctx: Ctx, args: any): Promise<Task[] | { error: string }> {
  const ids = new Set(ctx.inScope.map((s) => s.id));
  let tasks = (await listTasks()).filter((t) => ids.has(t.space_id));
  if (Array.isArray(args.task_ids) && args.task_ids.length) {
    const want = new Set(args.task_ids as string[]);
    return tasks.filter((t) => want.has(t.id));
  }
  const f = args.filter ?? {};
  if (f.space) {
    const sp = findSpace(ctx, f.space);
    if (isErr(sp)) return sp;
    if (sp) tasks = tasks.filter((t) => t.space_id === sp.id);
  }
  if (Array.isArray(f.status) && f.status.length) tasks = tasks.filter((t) => f.status.includes(t.status));
  else if (!f.include_done) tasks = tasks.filter((t) => t.status !== "done");
  if (Array.isArray(f.priority) && f.priority.length) tasks = tasks.filter((t) => f.priority.includes(t.priority));
  if (f.overdue) tasks = tasks.filter((t) => t.due_date && t.due_date < ctx.today && t.status !== "done");
  if (f.due_on) tasks = tasks.filter((t) => t.due_date === f.due_on);
  if (f.due_from) tasks = tasks.filter((t) => t.due_date && t.due_date >= f.due_from);
  if (f.due_to) tasks = tasks.filter((t) => t.due_date && t.due_date <= f.due_to);
  if (f.no_due_date) tasks = tasks.filter((t) => !t.due_date);
  if (f.text) tasks = tasks.filter((t) => t.title.includes(f.text));
  return tasks;
}
function sortTasks(ts: Task[]) {
  return [...ts].sort((a, b) => PRIORITY_META[b.priority].rank - PRIORITY_META[a.priority].rank || (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
}

/* ------------------------------ planning -------------------------------- */
type Plan =
  | { name: "add_tasks"; items: { title: string; space_id: string; priority?: Priority; status?: Status; due_date?: string | null; description?: string }[] }
  | { name: "update_tasks"; ids: string[]; changes: { status?: Status; priority?: Priority; due_date?: string | null; title?: string; space_id?: string }; titles: string[]; changeText: string }
  | { name: "delete_tasks"; ids: string[]; titles: string[] };

async function planMutation(ctx: Ctx, name: string, args: any): Promise<{ plan: Plan } | { error: string }> {
  if (name === "add_tasks") {
    const out: any[] = [];
    for (const t of args.tasks ?? []) {
      if (!t?.title?.trim()) continue;
      let sp: Space | undefined;
      if (t.space) { const r = findSpace(ctx, t.space); if (isErr(r)) return r; sp = r; }
      if (!sp && ctx.inScope.length === 1) sp = ctx.inScope[0];
      if (!sp) return { error: `לא צוין מרחב למשימה "${t.title}". מרחבים זמינים: ${ctx.inScope.map((s) => s.name).join(", ")}. שאל את המשתמש באיזה מרחב להוסיף.` };
      out.push({ title: t.title.trim(), space_id: sp.id, priority: PRIORITIES.includes(t.priority) ? t.priority : undefined, status: STATUSES.includes(t.status) ? t.status : undefined, due_date: /^\d{4}-\d{2}-\d{2}$/.test(t.due_date ?? "") ? t.due_date : null, description: t.description });
    }
    if (!out.length) return { error: "לא התקבלו משימות להוספה" };
    return { plan: { name, items: out } };
  }
  const matched = await matchTasks(ctx, args);
  if (isErr(matched)) return matched;
  if (name === "delete_tasks") {
    if (!matched.length) return { error: "לא נמצאו משימות מתאימות למחיקה" };
    return { plan: { name, ids: matched.map((t) => t.id), titles: matched.map((t) => t.title) } };
  }
  // update
  const c = args.changes ?? {};
  const changes: any = {}; const parts: string[] = [];
  if (STATUSES.includes(c.status)) { changes.status = c.status; parts.push(`סטטוס ← ${STATUS_META[c.status as Status].label}`); }
  if (PRIORITIES.includes(c.priority)) { changes.priority = c.priority; parts.push(`עדיפות ← ${PRIORITY_META[c.priority as Priority].label}`); }
  if ("due_date" in c) {
    if (c.due_date === null) { changes.due_date = null; parts.push("הסרת תאריך יעד"); }
    else if (/^\d{4}-\d{2}-\d{2}$/.test(c.due_date)) { changes.due_date = c.due_date; parts.push(`תאריך יעד ← ${formatDateHe(c.due_date)}`); }
  }
  if (c.title?.trim()) { changes.title = c.title.trim(); parts.push(`כותרת ← ${c.title.trim()}`); }
  if (c.space) { const sp = findSpace(ctx, c.space); if (isErr(sp)) return sp; if (sp) { changes.space_id = sp.id; parts.push(`מרחב ← ${sp.name}`); } }
  if (!parts.length) return { error: "לא צוינו שינויים תקינים" };
  const effective = matched.filter((t) => Object.entries(changes).some(([k, v]) => (t as any)[k] !== v));
  if (!effective.length) return { error: "אין משימות שדורשות שינוי (הן כבר במצב המבוקש או שלא נמצאו משימות מתאימות)" };
  return { plan: { name: "update_tasks", ids: effective.map((t) => t.id), changes, titles: effective.map((t) => t.title), changeText: parts.join(", ") } };
}
const planCount = (p: Plan) => (p.name === "add_tasks" ? p.items.length : p.ids.length);

function describePlans(plans: Plan[]): { text: string; count: number; items: string[] } {
  const lines: string[] = []; const items: string[] = []; let count = 0;
  for (const p of plans) {
    const n = planCount(p); count += n;
    if (p.name === "add_tasks") { lines.push(`להוסיף ${n} משימות`); items.push(...p.items.map((i) => i.title)); }
    else if (p.name === "delete_tasks") { lines.push(`למחוק ${n} משימות`); items.push(...p.titles); }
    else { lines.push(`לעדכן ${n} משימות (${p.changeText})`); items.push(...p.titles); }
  }
  return { text: `אני עומד ${lines.join(" ו")}.`, count, items };
}

async function execPlan(ctx: Ctx, p: Plan): Promise<{ result: any; summary: string }> {
  if (p.name === "add_tasks") {
    const created = [];
    for (const i of p.items) created.push(await createTask(i));
    return { result: { added: created.map((t) => tview(t, ctx)) }, summary: `נוספו ${created.length} משימות` };
  }
  if (p.name === "delete_tasks") {
    await deleteTasks(p.ids);
    return { result: { deleted: p.ids.length, titles: p.titles }, summary: `נמחקו ${p.ids.length} משימות` };
  }
  let n = 0;
  for (const id of p.ids) if (await updateTask(id, p.changes)) n++;
  return { result: { updated: n, titles: p.titles, changes: p.changes }, summary: `עודכנו ${n} משימות (${p.changeText})` };
}

async function runRead(ctx: Ctx, name: string, args: any): Promise<any> {
  if (name === "read_tasks") {
    const m = await matchTasks(ctx, args);
    if (isErr(m)) return m;
    const limit = Math.min(Number(args.limit) || 60, 100);
    const sorted = sortTasks(m);
    return { total: sorted.length, tasks: sorted.slice(0, limit).map((t) => tview(t, ctx)) };
  }
  if (name === "summarize_tasks") {
    const sp = args.space ? findSpace(ctx, args.space) : undefined;
    if (isErr(sp)) return sp;
    const ids = new Set((sp ? [sp] : ctx.inScope).map((s) => s.id));
    const all = (await listTasks()).filter((t) => ids.has(t.space_id));
    const open = all.filter((t) => t.status !== "done");
    const ws = weekStart(ctx.today);
    const per = (sp ? [sp] : ctx.inScope).map((s) => {
      const ts = all.filter((t) => t.space_id === s.id); const o = ts.filter((t) => t.status !== "done");
      return { space: s.name, open: o.length, overdue: o.filter((t) => t.due_date && t.due_date < ctx.today).length, done_this_week: ts.filter((t) => t.completed_at && t.completed_at.slice(0, 10) >= ws).length, urgent: o.filter((t) => t.priority === "urgent").length };
    });
    const count = <K extends string>(keys: readonly K[], f: (t: Task) => string) => Object.fromEntries(keys.map((k) => [k, open.filter((t) => f(t) === k).length]));
    return {
      total: all.length, open: open.length, done: all.length - open.length,
      by_status: count(STATUSES, (t) => t.status), by_priority: count(PRIORITIES, (t) => t.priority),
      overdue: open.filter((t) => t.due_date && t.due_date < ctx.today).map((t) => tview(t, ctx)),
      due_today: open.filter((t) => t.due_date === ctx.today).map((t) => tview(t, ctx)),
      urgent: open.filter((t) => t.priority === "urgent").map((t) => tview(t, ctx)),
      top_important: sortTasks(open).slice(0, 8).map((t) => tview(t, ctx)),
      per_space: per,
    };
  }
  return { error: "כלי לא מוכר" };
}
const MUTATING = new Set(["add_tasks", "update_tasks", "delete_tasks"]);

/* ------------------------------ prompt ---------------------------------- */
function systemPrompt(ctx: Ctx, channel: string) {
  const days = Array.from({ length: 10 }, (_, i) => { const d = addDays(ctx.today, i); return `${d} (יום ${WEEKDAYS_HE[weekdayOf(d)]}${i === 0 ? ", היום" : i === 1 ? ", מחר" : ""})`; }).join("\n");
  const scopeText = ctx.scope === "all" ? "כל המרחבים" : `המרחב "${ctx.inScope[0]?.name}" בלבד`;
  return `אתה סוכן ניהול משימות חכם בתוך מערכת "שליטה במשימות". אתה עונה תמיד בעברית, קצר וענייני (עד 3-4 משפטים, בלי הקדמות), ובטון חם ומקצועי.
תחום העבודה הנוכחי: ${scopeText}. אתה פועל אך ורק על משימות בתחום הזה; אם מבקשים משהו מחוץ לו, הסבר בקצרה שאפשר לשנות את הבחירה בראש הצ'אט.
המרחבים בתחום: ${ctx.inScope.map((s) => `"${s.name}"`).join(", ") || "אין"}.
היום: ${ctx.today} (יום ${WEEKDAYS_HE[weekdayOf(ctx.today)]}). אזור זמן: ישראל. הימים הקרובים:
${days}
כללים:
- השתמש בכלים כדי לקרוא ולשנות משימות. אל תמציא משימות ואל תנחש מזהים - קרא קודם עם read_tasks כשצריך.
- כשהמשתמש מבקש פעולה, בצע אותה בקריאה לכלי. את בקשת האישור (מעל ${CONFIRM_OVER} משימות או מחיקה) מבצעת המערכת בעצמה - אל תשאל "האם לאשר" בטקסט.
- ברירת מחדל להוספת משימה: עדיפות בינונית, סטטוס חדשה. "עד ה-10" = התאריך הקרוב עם היום ה-10 בחודש. "מחר", "ביום ראשון" וכו' - לפי הלוח למעלה.
- במרחב בודד אפשר להשמיט שם מרחב בהוספה. בכל המרחבים - אם לא ברור המרחב, שאל.
- אחרי שפעלת: אמור בקצרה מה עשית (כמה משימות ומה השתנה). בשאלות על עדיפויות: תן המלצה ממוקדת (דחוף, באיחור, להיום) ונמק במשפט.
- אל תשתמש בכותרות או בטבלאות. רשימות קצרות עם מקף מותרות${channel === "whatsapp" ? ". זו שיחת וואטסאפ: אפשר *הדגשה* בכוכביות ואימוג'י בודד" : ""}.`;
}

/* ------------------------------ main loop ------------------------------- */
type OAIMsg = any;

async function loop(messages: OAIMsg[], ctx: Ctx, channel: string, chatRef: string | null, acc: { mutated: boolean; actions: string[] }): Promise<AgentResult> {
  const ai = client();
  for (let step = 0; step < 6; step++) {
    const res = await ai.chat.completions.create({ model: model(), messages: [{ role: "system", content: systemPrompt(ctx, channel) }, ...messages], tools: TOOLS });
    const msg: any = res.choices[0].message;
    const calls: any[] = (msg.tool_calls ?? []).filter((c: any) => c.type === "function");
    if (!calls.length) return { reply: (msg.content || "בוצע.").trim(), mutated: acc.mutated, actions: acc.actions };

    messages.push({ role: "assistant", content: msg.content ?? null, tool_calls: msg.tool_calls });
    const parsed = calls.map((c) => { let a: any = {}; try { a = JSON.parse(c.function.arguments || "{}"); } catch {} return { id: c.id, name: c.function.name as string, args: a }; });

    // Plan all mutating calls first
    const plans: Record<string, Plan> = {}; const errors: Record<string, any> = {};
    for (const c of parsed) if (MUTATING.has(c.name)) {
      const r = await planMutation(ctx, c.name, c.args);
      if ("plan" in r) plans[c.id] = r.plan; else errors[c.id] = r;
    }
    const planList = Object.values(plans);
    const total = planList.reduce((s, p) => s + planCount(p), 0);
    const needsConfirm = planList.some((p) => p.name === "delete_tasks") || total > CONFIRM_OVER;
    if (needsConfirm) {
      const d = describePlans(planList);
      const rows = await query<{ id: string }>(
        "INSERT INTO pending_actions(channel,chat_ref,payload) VALUES ($1,$2,$3::jsonb) RETURNING id",
        [channel, chatRef, JSON.stringify({ messages, parsed, plans, errors, scope: ctx.scope })]
      );
      return { reply: `${d.text} לאשר?`, mutated: acc.mutated, actions: acc.actions, pending: { id: rows[0].id, text: d.text, count: d.count, items: d.items } };
    }
    await runCalls(messages, ctx, parsed, plans, errors, acc, true);
  }
  return { reply: "לא הצלחתי להשלים את הבקשה. נסה לנסח אותה אחרת.", mutated: acc.mutated, actions: acc.actions };
}

async function runCalls(messages: OAIMsg[], ctx: Ctx, parsed: any[], plans: Record<string, Plan>, errors: Record<string, any>, acc: { mutated: boolean; actions: string[] }, approved: boolean) {
  for (const c of parsed) {
    let result: any;
    try {
      if (MUTATING.has(c.name)) {
        if (errors[c.id]) result = errors[c.id];
        else if (!approved) result = { declined: true, note: "המשתמש סירב לאשר את הפעולה. לא בוצע שינוי." };
        else { const r = await execPlan(ctx, plans[c.id]); result = r.result; acc.mutated = true; acc.actions.push(r.summary); }
      } else result = await runRead(ctx, c.name, c.args);
    } catch (e: any) { result = { error: String(e?.message ?? e) }; }
    messages.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify(result) });
  }
}

export async function runAgent(opts: { history: ChatMsg[]; scope: Scope; channel?: string; chatRef?: string | null }): Promise<AgentResult> {
  const ctx = await loadCtx(opts.scope);
  if (opts.scope !== "all" && !ctx.inScope.length) return { reply: "המרחב שנבחר לא קיים יותר. בחר מרחב אחר בראש הצ'אט.", mutated: false, actions: [] };
  const messages: OAIMsg[] = opts.history.slice(-20).map((m) => ({ role: m.role, content: m.content }));
  return loop(messages, ctx, opts.channel ?? "web", opts.chatRef ?? null, { mutated: false, actions: [] });
}

export async function resolvePending(id: string, approve: boolean): Promise<AgentResult> {
  const rows = await query<{ payload: any; channel: string; chat_ref: string | null }>(
    "UPDATE pending_actions SET status=$2 WHERE id=$1 AND status='pending' RETURNING payload, channel, chat_ref", [id, approve ? "approved" : "declined"]);
  if (!rows.length) return { reply: "הבקשה הזו כבר טופלה או שפגה תוקפה.", mutated: false, actions: [] };
  const { payload, channel, chat_ref } = rows[0];
  const ctx = await loadCtx(payload.scope);
  const acc = { mutated: false, actions: [] as string[] };
  const messages: OAIMsg[] = payload.messages;
  await runCalls(messages, ctx, payload.parsed, payload.plans, payload.errors, acc, approve);
  if (!approve) return { reply: "בסדר, לא ביצעתי שינוי.", mutated: false, actions: [] };
  try { return await loop(messages, ctx, channel, chat_ref, acc); }
  catch { return { reply: acc.actions.join(". ") + ".", mutated: acc.mutated, actions: acc.actions }; }
}
