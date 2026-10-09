"use client";
import Link from "next/link";
import { useMemo } from "react";
import { Check, Plus } from "lucide-react";
import { useStore } from "./store";
import { Dot, PriorityBadge } from "./ui";
import { byPriority, DueLabel } from "./views";
import { VIEW_META } from "@/lib/constants";
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
    { key: "overdue", title: "באיחור", color: "#DC2626", list: lists.overdue, empty: "אין משימות באיחור" },
    { key: "today", title: "להיום", color: "#4F46E5", list: lists.today, empty: "אין משימות להיום" },
    { key: "urgent", title: "דחוף", color: "#EA580C", list: lists.urgent, empty: "אין משימות דחופות" },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">{s.today && formatDateHe(s.today, true)}</p>
          <h1 className="text-[34px] leading-tight font-extrabold tracking-tight mt-1">מה על השולחן היום</h1>
        </div>
        <button className="btn btn-primary" onClick={() => s.newTask({ space_id: chosen[0]?.id })}><Plus className="size-[18px]" strokeWidth={2.5} />משימה חדשה</button>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 mt-7" role="group" aria-label="בחירת מרחבים להצגה">
        <span className="text-sm font-medium text-muted me-1">מציג מרחבים:</span>
        {s.spaces.map((sp) => {
          const on = sel.has(sp.id);
          return (
            <button key={sp.id} onClick={() => toggle(sp.id)} aria-pressed={on}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 min-h-10 text-sm transition ${on ? "bg-white border-ink text-ink font-semibold" : "bg-transparent border-gray-300 text-muted font-medium hover:bg-white"}`}>
              <Dot color={sp.color} size={9} />{sp.name}{on && <Check className="size-3.5" strokeWidth={3} />}
            </button>
          );
        })}
      </div>

      {!chosen.length ? (
        <div className="card p-12 text-center text-muted mt-5">בחרו לפחות מרחב אחד כדי לראות את המשימות החשובות.</div>
      ) : (
        <section className="card mt-5 grid lg:grid-cols-3 lg:divide-x lg:divide-x-reverse divide-y lg:divide-y-0 divide-line overflow-hidden">
          {sections.map(({ key, title, color, list, empty }) => (
            <div key={key} className="p-5 sm:p-6 min-w-0">
              <h2 className="flex items-center gap-2 font-bold text-base"><Dot color={color} />{title}<span className="text-muted font-medium">{list.length}</span></h2>
              <ul className="mt-2 max-h-96 overflow-y-auto scroll-thin">
                {list.map((t) => (
                  <li key={t.id}>
                    <div className="flex items-center gap-3.5 py-3 border-t border-gray-100 first:border-t-0 cursor-pointer hover:bg-gray-50/70 -mx-2 px-2 rounded-lg" onClick={() => s.openTask(t.id)}>
                      <button aria-label="סימון כהושלמה" onClick={(e) => { e.stopPropagation(); s.updateTask(t.id, { status: "done" }); }} className="size-[22px] shrink-0 rounded-full border-2 border-gray-300 hover:border-green-600 hover:bg-green-50 grid place-items-center group">
                        <Check className="size-3 text-green-600 opacity-0 group-hover:opacity-100" strokeWidth={3.5} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold" dir="auto">{t.title}</p>
                        <div className="flex items-center gap-1.5 text-[13px] text-muted"><Dot color={spaceOf(t)?.color ?? "#999"} size={7} />{spaceOf(t)?.name} · <DueLabel task={t} today={s.today} plain /></div>
                      </div>
                      {key !== "urgent" && <PriorityBadge p={t.priority} className="shrink-0" />}
                    </div>
                  </li>
                ))}
                {!list.length && <li className="py-8 text-center text-sm text-muted">{empty}</li>}
              </ul>
            </div>
          ))}
        </section>
      )}

      <h2 className="font-bold text-xl mt-12 mb-4">המרחבים שלי</h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {s.spaces.map((sp) => {
          const ts = s.tasks.filter((t) => t.space_id === sp.id);
          const o = ts.filter((t) => t.status !== "done");
          const overdue = o.filter((t) => t.due_date && t.due_date < s.today).length;
          const doneWeek = ts.filter((t) => t.completed_at && t.completed_at.slice(0, 10) >= ws).length;
          const pct = ts.length ? Math.round(((ts.length - o.length) / ts.length) * 100) : 0;
          return (
            <Link key={sp.id} href={`/space/${sp.id}`} className="card p-6 hover:border-gray-300 hover:shadow-md transition block">
              <div className="flex items-center gap-2.5 font-bold text-lg"><Dot color={sp.color} size={12} />{sp.name}<span className="ms-auto text-[13px] font-medium text-muted">{VIEW_META[sp.view].label}</span></div>
              <div className="flex items-baseline gap-2 mt-5"><span className="text-[40px] leading-none font-extrabold">{o.length}</span><span className="text-muted">פתוחות</span></div>
              <p className="mt-1.5 text-sm text-muted">{overdue ? <span className="text-red-600 font-semibold">{overdue} באיחור</span> : "אין באיחור"} · נסגרו השבוע {doneWeek}</p>
              <div className="mt-4 h-1.5 rounded-full bg-soft overflow-hidden" role="progressbar" aria-valuenow={pct} aria-label="התקדמות"><div className="h-full rounded-full" style={{ width: pct + "%", background: sp.color }} /></div>
            </Link>
          );
        })}
        <button onClick={() => s.setSpaceEditor({ mode: "new" })} className="rounded-[1.1rem] border-2 border-dashed border-gray-300 text-muted hover:text-ink hover:bg-white transition min-h-40 grid place-items-center font-semibold"><span className="flex items-center gap-2"><Plus className="size-5" />מרחב חדש</span></button>
      </div>
    </div>
  );
}
