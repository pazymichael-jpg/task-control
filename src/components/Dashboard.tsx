"use client";
import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, CalendarCheck, Check, Flame, Plus } from "lucide-react";
import { useStore } from "./store";
import { Dot, PriorityBadge } from "./ui";
import { byPriority, DueLabel } from "./views";
import { VIEW_ICON } from "./SpaceModal";
import { formatDateHe, weekStart } from "@/lib/dates";
import type { Task } from "@/lib/constants";

export default function Dashboard() {
  const s = useStore();
  const sel = new Set(s.dashSelected);
  const chosen = s.spaces.filter((x) => sel.has(x.id));
  const open = useMemo(() => s.tasks.filter((t) => sel.has(t.space_id) && t.status !== "done"), [s.tasks, s.dashSelected]);
  const lists = useMemo(() => ({
    urgent: open.filter((t) => t.priority === "urgent").sort(byPriority),
    today: open.filter((t) => t.due_date === s.today).sort(byPriority),
    overdue: open.filter((t) => t.due_date && t.due_date < s.today).sort((a, b) => a.due_date!.localeCompare(b.due_date!)),
  }), [open, s.today]);
  const toggle = (id: string) => s.setDashSelected(sel.has(id) ? s.dashSelected.filter((x) => x !== id) : [...s.dashSelected, id]);
  const spaceOf = (t: Task) => s.spaces.find((x) => x.id === t.space_id);
  const ws = s.today ? weekStart(s.today) : "";

  if (!s.loaded) return <div className="py-24 text-center text-muted">טוען…</div>;
  const sections = [
    { key: "overdue", title: "באיחור", icon: AlertTriangle, color: "#dc2626", list: lists.overdue, empty: "אין משימות באיחור" },
    { key: "today", title: "להיום", icon: CalendarCheck, color: "#4f46e5", list: lists.today, empty: "אין משימות להיום" },
    { key: "urgent", title: "דחוף", icon: Flame, color: "#ea580c", list: lists.urgent, empty: "אין משימות דחופות" },
  ] as const;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted">{s.today && formatDateHe(s.today, true)}</p>
          <h1 className="text-3xl font-extrabold tracking-tight">מה דורש תשומת לב היום</h1>
        </div>
        <button className="btn btn-primary" onClick={() => s.newTask({ space_id: chosen[0]?.id })}><Plus className="size-4" />משימה חדשה</button>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="בחירת מרחבים להצגה">
        <span className="text-sm font-semibold text-muted me-1">מרחבים:</span>
        {s.spaces.map((sp) => {
          const on = sel.has(sp.id);
          return (
            <button key={sp.id} onClick={() => toggle(sp.id)} aria-pressed={on}
              className="flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition"
              style={on ? { background: sp.color + "18", borderColor: sp.color, color: "#141a2e" } : { background: "#fff", borderColor: "#e3e7f1", color: "#667091" }}>
              {on ? <Check className="size-3.5" style={{ color: sp.color }} strokeWidth={3} /> : <Dot color={sp.color} size={8} />}{sp.name}
            </button>
          );
        })}
        {s.spaces.length > 1 && <button className="text-sm text-muted hover:text-ink underline-offset-2 hover:underline" onClick={() => s.setDashSelected(sel.size === s.spaces.length ? [] : s.spaces.map((x) => x.id))}>{sel.size === s.spaces.length ? "נקה הכל" : "בחר הכל"}</button>}
      </div>

      {!chosen.length ? (
        <div className="card p-12 text-center text-muted">בחרו לפחות מרחב אחד כדי לראות את המשימות החשובות.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {sections.map(({ key, title, icon: Icon, color, list, empty }) => (
            <section key={key} className="card overflow-hidden flex flex-col">
              <h2 className="flex items-center gap-2 px-4 py-3 font-bold border-b border-line" style={{ color }}>
                <Icon className="size-[18px]" />{title}
                <span className="ms-auto text-xs font-bold rounded-full px-2 py-0.5" style={{ background: color + "18" }}>{list.length}</span>
              </h2>
              <ul className="divide-y divide-line flex-1 max-h-96 overflow-y-auto scroll-thin">
                {list.map((t) => (
                  <li key={t.id}>
                    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-soft/70 cursor-pointer" onClick={() => s.openTask(t.id)}>
                      <button aria-label="סימון כהושלמה" onClick={(e) => { e.stopPropagation(); s.updateTask(t.id, { status: "done" }); }} className="size-5 shrink-0 rounded-md border-2 border-line hover:border-green-500 hover:bg-green-50 grid place-items-center group">
                        <Check className="size-3 text-green-600 opacity-0 group-hover:opacity-100" strokeWidth={3.5} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-sm" dir="auto">{t.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted"><Dot color={spaceOf(t)?.color ?? "#999"} size={7} />{spaceOf(t)?.name}<DueLabel task={t} today={s.today} /></div>
                      </div>
                      {key !== "urgent" && <PriorityBadge p={t.priority} />}
                    </div>
                  </li>
                ))}
                {!list.length && <li className="px-4 py-8 text-center text-sm text-muted">{empty} ✨</li>}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div>
        <h2 className="font-bold text-lg mb-3">המרחבים שלי</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {s.spaces.map((sp) => {
            const ts = s.tasks.filter((t) => t.space_id === sp.id);
            const o = ts.filter((t) => t.status !== "done");
            const overdue = o.filter((t) => t.due_date && t.due_date < s.today).length;
            const doneWeek = ts.filter((t) => t.completed_at && t.completed_at.slice(0, 10) >= ws).length;
            const pct = ts.length ? Math.round(((ts.length - o.length) / ts.length) * 100) : 0;
            const Icon = VIEW_ICON[sp.view];
            return (
              <Link key={sp.id} href={`/space/${sp.id}`} className="card p-4 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition block">
                <i className="absolute inset-x-0 top-0 h-1.5" style={{ background: sp.color }} />
                <div className="flex items-center gap-2 mt-1.5 mb-4"><Dot color={sp.color} /><h3 className="font-bold text-lg">{sp.name}</h3><Icon className="size-4 text-muted ms-auto" /></div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat n={o.length} label="פתוחות" />
                  <Stat n={overdue} label="באיחור" color={overdue ? "#dc2626" : undefined} />
                  <Stat n={doneWeek} label="נסגרו השבוע" color={doneWeek ? "#16a34a" : undefined} />
                </div>
                <div className="mt-4 h-1.5 rounded-full bg-soft overflow-hidden"><div className="h-full rounded-full" style={{ width: pct + "%", background: sp.color }} /></div>
              </Link>
            );
          })}
          <button onClick={() => s.setSpaceEditor({ mode: "new" })} className="rounded-2xl border-2 border-dashed border-line text-muted hover:text-ink hover:bg-white transition min-h-36 grid place-items-center font-semibold"><span className="flex items-center gap-2"><Plus className="size-5" />מרחב חדש</span></button>
        </div>
      </div>
    </div>
  );
}
function Stat({ n, label, color }: { n: number; label: string; color?: string }) {
  return <div className="rounded-xl bg-soft/70 py-2"><div className="text-2xl font-extrabold leading-none" style={{ color }}>{n}</div><div className="text-[11px] font-semibold text-muted mt-1">{label}</div></div>;
}
