"use client";
import { useMemo, useState } from "react";
import { CalendarClock, Check, ChevronDown, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useStore } from "./store";
import { PriorityBadge, StatusBadge } from "./ui";
import { PRIORITIES, PRIORITY_META, STATUSES, STATUS_META, type Space, type Task } from "@/lib/constants";
import { addDays, relativeLabel, weekdayOf, WEEKDAYS_HE } from "@/lib/dates";

export const byPriority = (a: Task, b: Task) =>
  PRIORITY_META[b.priority].rank - PRIORITY_META[a.priority].rank || (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || a.created_at.localeCompare(b.created_at);

export function DueLabel({ task, today }: { task: Task; today: string }) {
  if (!task.due_date) return null;
  const over = task.due_date < today && task.status !== "done";
  const isToday = task.due_date === today && task.status !== "done";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${over ? "text-red-600" : isToday ? "text-brand" : "text-muted"}`}>
      <CalendarClock className="size-3.5" /><bdi>{relativeLabel(task.due_date, today)}</bdi>{over && <span>· באיחור</span>}
    </span>
  );
}

/* ------------------------------- Kanban -------------------------------- */
export function Kanban({ space, tasks }: { space: Space; tasks: Task[] }) {
  const s = useStore();
  const [over, setOver] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 items-start">
      {STATUSES.map((st) => {
        const list = tasks.filter((t) => t.status === st).sort(byPriority);
        const m = STATUS_META[st];
        return (
          <section key={st}
            onDragOver={(e) => { e.preventDefault(); setOver(st); }}
            onDragLeave={() => setOver((o) => (o === st ? null : o))}
            onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain") || dragId; setOver(null); setDragId(null); const t = tasks.find((x) => x.id === id); if (t && t.status !== st) s.updateTask(t.id, { status: st }); }}
            className="rounded-2xl p-2.5 transition min-h-40" style={{ background: over === st ? m.bg : "#e9ecf5", outline: over === st ? `2px dashed ${m.color}` : "none" }}>
            <header className="flex items-center gap-2 px-1.5 pb-2.5 pt-1">
              <i className="size-2.5 rounded-full" style={{ background: m.color }} />
              <h3 className="font-bold text-sm">{m.label}</h3>
              <span className="text-xs font-semibold text-muted bg-white/80 rounded-full px-2">{list.length}</span>
              <button onClick={() => s.newTask({ space_id: space.id, status: st })} aria-label={`משימה חדשה ב${m.label}`} className="ms-auto grid place-items-center size-7 rounded-lg text-muted hover:bg-white"><Plus className="size-4" /></button>
            </header>
            <div className="space-y-2.5">
              {list.map((t) => (
                <article key={t.id} draggable
                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", t.id); e.dataTransfer.effectAllowed = "move"; setDragId(t.id); }}
                  onDragEnd={() => { setDragId(null); setOver(null); }}
                  onClick={() => s.openTask(t.id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && s.openTask(t.id)}
                  className="card p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition relative overflow-hidden" style={{ opacity: dragId === t.id ? 0.4 : 1 }}>
                  <i className="absolute inset-y-0 start-0 w-1" style={{ background: PRIORITY_META[t.priority].color }} />
                  <p className={`font-semibold text-sm leading-snug ps-1.5 ${t.status === "done" ? "line-through text-muted" : ""}`} dir="auto">{t.title}</p>
                  <div className="flex items-center justify-between gap-2 mt-2.5 ps-1.5">
                    <PriorityBadge p={t.priority} />
                    <DueLabel task={t} today={s.today} />
                  </div>
                </article>
              ))}
              {!list.length && <p className="text-center text-xs text-muted py-6">גררו משימה לכאן</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* -------------------------------- TODO --------------------------------- */
export function TodoList({ space, tasks }: { space: Space; tasks: Task[] }) {
  const s = useStore();
  const [title, setTitle] = useState("");
  const [showDone, setShowDone] = useState(false);
  const done = tasks.filter((t) => t.status === "done").sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
  const open = tasks.filter((t) => t.status !== "done");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const v = title.trim(); setTitle("");
    await s.createTask({ space_id: space.id, title: v, priority: "medium", status: "new" });
  }
  const row = (t: Task) => (
    <li key={t.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-soft/70 transition cursor-pointer" onClick={() => s.openTask(t.id)}>
      <button role="checkbox" aria-checked={t.status === "done"} aria-label={t.status === "done" ? "החזרה לפתוחה" : "סימון כהושלמה"}
        onClick={(e) => { e.stopPropagation(); s.updateTask(t.id, { status: t.status === "done" ? "new" : "done" }); }}
        className="size-5.5 shrink-0 rounded-md border-2 grid place-items-center transition"
        style={t.status === "done" ? { background: "#16a34a", borderColor: "#16a34a" } : { borderColor: PRIORITY_META[t.priority].color, background: "#fff" }}>
        {t.status === "done" && <Check className="size-3.5 text-white" strokeWidth={3.5} />}
      </button>
      <span className={`flex-1 min-w-0 truncate font-medium ${t.status === "done" ? "line-through text-muted" : ""}`} dir="auto">{t.title}</span>
      {t.status !== "done" && t.status !== "new" && <StatusBadge s={t.status} className="hidden sm:inline-flex" />}
      <DueLabel task={t} today={s.today} />
      <PriorityBadge p={t.priority} className="hidden sm:inline-flex" />
    </li>
  );
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <form onSubmit={add} className="card flex items-center gap-2 p-2 ps-4">
        <Plus className="size-5 text-muted shrink-0" />
        <input dir="auto" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="הוספה מהירה: כתבו משימה ולחצו Enter" className="flex-1 bg-transparent py-2 outline-none" aria-label="הוספה מהירה" />
        {title.trim() && <button className="btn btn-primary !py-1.5">הוספה</button>}
      </form>
      {PRIORITIES.slice().reverse().map((p) => {
        const list = open.filter((t) => t.priority === p).sort(byPriority);
        if (!list.length) return null;
        const m = PRIORITY_META[p];
        return (
          <section key={p} className="card overflow-hidden">
            <h3 className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b border-line" style={{ background: m.bg + "99", color: m.color }}>
              <i className="size-2.5 rounded-full" style={{ background: m.color }} />{m.label}<span className="font-semibold opacity-70">{list.length}</span>
            </h3>
            <ul className="divide-y divide-line">{list.map(row)}</ul>
          </section>
        );
      })}
      {!open.length && <div className="card p-10 text-center text-muted"><p className="font-bold text-ink text-lg">הכל הושלם 🎉</p><p className="text-sm mt-1">אין משימות פתוחות. הוסיפו אחת למעלה.</p></div>}
      {done.length > 0 && (
        <section className="card overflow-hidden">
          <button onClick={() => setShowDone((v) => !v)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-muted hover:bg-soft/70">
            <ChevronDown className={`size-4 transition ${showDone ? "" : "-rotate-90 rtl:rotate-90"}`} />הושלמו <span className="font-semibold">{done.length}</span>
          </button>
          {showDone && <ul className="divide-y divide-line border-t border-line">{done.map(row)}</ul>}
        </section>
      )}
    </div>
  );
}

/* ------------------------------ Calendar ------------------------------- */
const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

export function CalendarView({ space, tasks }: { space: Space; tasks: Task[] }) {
  const s = useStore();
  const base = s.today || new Date().toISOString().slice(0, 10);
  const [ym, setYm] = useState<[number, number]>(() => [Number(base.slice(0, 4)), Number(base.slice(5, 7)) - 1]);
  const [dayOpen, setDayOpen] = useState<string | null>(null);
  const [dropDay, setDropDay] = useState<string | null>(null);
  const [y, m] = ym;

  const days = useMemo(() => {
    const first = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const start = addDays(first, -weekdayOf(first));
    const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const weeks = Math.ceil((weekdayOf(first) + dim) / 7);
    return Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  }, [y, m]);
  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) if (t.due_date) map.set(t.due_date, [...(map.get(t.due_date) ?? []), t]);
    for (const [k, v] of map) map.set(k, v.sort((a, b) => (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0) || byPriority(a, b)));
    return map;
  }, [tasks]);
  const undated = tasks.filter((t) => !t.due_date && t.status !== "done");
  const go = (d: number) => setYm(([yy, mm]) => { const n = new Date(Date.UTC(yy, mm + d, 1)); return [n.getUTCFullYear(), n.getUTCMonth()]; });
  const MAX = 3;

  const chip = (t: Task) => {
    const pm = PRIORITY_META[t.priority];
    return (
      <button key={t.id} draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", t.id); e.stopPropagation(); }}
        onClick={(e) => { e.stopPropagation(); s.openTask(t.id); }} title={t.title}
        className="w-full text-start truncate rounded-md px-1.5 py-0.5 text-xs font-semibold border-s-[3px] hover:brightness-95 transition"
        style={{ background: pm.bg, color: pm.color, borderColor: pm.color, opacity: t.status === "done" ? 0.55 : 1, textDecoration: t.status === "done" ? "line-through" : "none" }} dir="auto">
        {t.title}
      </button>
    );
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-extrabold min-w-36">{MONTHS[m]} <bdi>{y}</bdi></h2>
        <div className="flex items-center gap-1">
          <button onClick={() => go(-1)} aria-label="חודש קודם" className="btn btn-ghost !p-2"><ChevronRight className="size-4" /></button>
          <button onClick={() => go(1)} aria-label="חודש הבא" className="btn btn-ghost !p-2"><ChevronLeft className="size-4" /></button>
          <button onClick={() => setYm([Number(base.slice(0, 4)), Number(base.slice(5, 7)) - 1])} className="btn btn-ghost">היום</button>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 bg-soft border-b border-line text-xs font-bold text-muted">
          {WEEKDAYS_HE.map((d, i) => <div key={d} className={`py-2 text-center ${i === 6 ? "text-brand" : ""}`}><span className="hidden sm:inline">יום </span>{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const inMonth = Number(d.slice(5, 7)) - 1 === m;
            const list = byDay.get(d) ?? [];
            const isToday = d === s.today;
            const dn = Number(d.slice(8));
            return (
              <div key={d} onClick={() => s.newTask({ space_id: space.id, due_date: d })}
                onDragOver={(e) => { e.preventDefault(); setDropDay(d); }} onDragLeave={() => setDropDay((x) => (x === d ? null : x))}
                onDrop={(e) => { e.preventDefault(); setDropDay(null); const t = tasks.find((x) => x.id === e.dataTransfer.getData("text/plain")); if (t && t.due_date !== d) s.updateTask(t.id, { due_date: d }); }}
                className={`relative min-h-24 sm:min-h-32 p-1 sm:p-1.5 border-b border-s border-line cursor-pointer transition hover:bg-brand-soft/40 ${i % 7 === 0 ? "border-s-0" : ""} ${inMonth ? "" : "bg-soft/60"}`}
                style={dropDay === d ? { background: space.color + "22" } : undefined}>
                <div className="flex justify-between items-start mb-1">
                  <span className={`grid place-items-center size-6 rounded-full text-xs font-bold ${isToday ? "text-white" : inMonth ? "" : "text-muted/60"}`} style={isToday ? { background: space.color } : undefined}>{dn}</span>
                  {list.length > 0 && <span className="text-[10px] font-bold text-muted sm:hidden">{list.length}</span>}
                </div>
                <div className="space-y-0.5 hidden sm:block">
                  {list.slice(0, MAX).map(chip)}
                  {list.length > MAX && <button onClick={(e) => { e.stopPropagation(); setDayOpen(d); }} className="text-xs font-semibold text-muted hover:text-ink px-1">+{list.length - MAX} נוספות</button>}
                </div>
                <div className="sm:hidden flex flex-wrap gap-0.5">{list.slice(0, 6).map((t) => <i key={t.id} className="size-1.5 rounded-full" style={{ background: PRIORITY_META[t.priority].color }} />)}</div>
                {dayOpen === d && <DayPop day={d} list={list} onClose={() => setDayOpen(null)} chip={chip} onNew={() => { setDayOpen(null); s.newTask({ space_id: space.id, due_date: d }); }} />}
              </div>
            );
          })}
        </div>
      </div>
      {undated.length > 0 && (
        <div className="card p-3">
          <h3 className="text-xs font-bold text-muted mb-2">ללא תאריך יעד ({undated.length})</h3>
          <div className="flex flex-wrap gap-1.5">{undated.map((t) => <div key={t.id} className="max-w-60">{chip(t)}</div>)}</div>
        </div>
      )}
    </div>
  );
}

function DayPop({ day, list, onClose, chip, onNew }: { day: string; list: Task[]; onClose: () => void; chip: (t: Task) => React.ReactNode; onNew: () => void }) {
  const [, mm, dd] = day.split("-").map(Number);
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); onClose(); }} />
      <div className="absolute z-40 top-1 inset-s-1 w-56 card shadow-pop p-2.5 space-y-1 anim-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1"><b className="text-sm"><bdi>{dd}/{mm}</bdi> · {list.length} משימות</b>
          <button onClick={onNew} aria-label="משימה חדשה" className="grid place-items-center size-6 rounded-md hover:bg-soft"><Plus className="size-4" /></button></div>
        {list.map(chip)}
      </div>
    </>
  );
}
