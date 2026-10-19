"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useStore } from "./store";
import { Dot } from "./ui";
import { STATUSES, STATUS_META, isClosed, type Status, type Task } from "@/lib/constants";
import { relativeLabel } from "@/lib/dates";

/* Textarea that grows with its content and saves on blur. */
function Cell({ value, onSave, placeholder, singleLine, className = "", label }: { value: string; onSave: (v: string) => void; placeholder?: string; singleLine?: boolean; className?: string; label: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [v, setV] = useState(value);
  const [focused, setFocused] = useState(false);
  if (!focused && v !== value) setV(value);
  useLayoutEffect(() => { const el = ref.current; if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }, [v]);
  return (
    <textarea ref={ref} rows={1} dir="auto" value={v} placeholder={placeholder} aria-label={label}
      onFocus={() => setFocused(true)}
      onChange={(e) => setV(singleLine ? e.target.value.replace(/\n/g, " ") : e.target.value)}
      onBlur={() => { setFocused(false); const t = singleLine ? v.trim() : v; if (t !== value && (!singleLine || t)) onSave(t); else setV(value); }}
      onKeyDown={(e) => { if (e.key === "Escape") { setV(value); setTimeout(() => ref.current?.blur()); } if (singleLine && e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); ref.current?.blur(); } }}
      className={`block w-full resize-none bg-transparent outline-none rounded px-1 -mx-1 focus:bg-white focus:ring-2 focus:ring-brand/40 placeholder:text-gray-400 ${className}`} />
  );
}

function DueCell({ t, today, onChange }: { t: Task; today: string; onChange: (p: Partial<Task>) => void }) {
  const overdue = !!t.due_date && t.due_date < today && !isClosed(t.status);
  return (
    <div className="flex flex-col items-start gap-0.5">
      <label className="relative cursor-pointer">
        <span className={`text-[13px] whitespace-nowrap ${t.due_date ? (overdue ? "text-red-600 font-semibold" : "text-ink") : "text-gray-300"}`}>{t.due_date ? relativeLabel(t.due_date, today) : "תאריך"}</span>
        <input type="date" value={t.due_date ?? ""} aria-label="תאריך יעד" onChange={(e) => onChange({ due_date: e.target.value || null, ...(e.target.value ? {} : { due_time: null }) })} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
      </label>
      {t.due_date && (
        <label className="relative cursor-pointer">
          <span className={`text-xs whitespace-nowrap ${t.due_time ? "text-ink/70" : "text-gray-300"}`}>{t.due_time ?? "+ שעה"}</span>
          <input type="time" value={t.due_time ?? ""} aria-label="שעה" onChange={(e) => onChange({ due_time: e.target.value || null })} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
        </label>
      )}
    </div>
  );
}

function StatusCell({ status, onChange }: { status: Status; onChange: (s: Status) => void }) {
  const m = STATUS_META[status];
  return (
    <label className="relative inline-flex">
      <span className="rounded-md border border-black/10 bg-white/70 px-2 py-0.5 text-[13px] font-semibold whitespace-nowrap" style={{ color: m.ink }}>{m.label}</span>
      <select value={status} aria-label="סטטוס" onChange={(e) => onChange(e.target.value as Status)} className="absolute inset-0 opacity-0 cursor-pointer w-full">
        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
      </select>
    </label>
  );
}

const fmtDone = (s: string | null) => { if (!s) return ""; const [, m, d] = s.slice(0, 10).split("-").map(Number); return `${d}/${m}`; };

export default function TaskTable({ tasks, spaceId, archive }: { tasks: Task[]; spaceId?: string; archive?: boolean }) {
  const s = useStore();
  const [draft, setDraft] = useState("");

  function setStatus(t: Task, status: Status) {
    const prev = t.status;
    s.updateTask(t.id, { status });
    if (isClosed(status) !== isClosed(prev)) {
      s.showToast(isClosed(status) ? `${STATUS_META[status].label} · הועבר לארכיון` : "הוחזר לרשימה", () => s.updateTask(t.id, { status: prev }));
    }
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const title = draft.trim();
    if (!title || !spaceId) return;
    setDraft("");
    await s.createTask({ space_id: spaceId, title });
  }

  const th = "px-2 py-1.5 text-start text-xs font-semibold text-muted border-b border-line";
  const td = "px-2 py-1.5 align-top border-b border-line";
  return (
    <div className="bg-white border border-line rounded-lg overflow-hidden">
      <table className="w-full border-collapse table-fixed text-[15px]">
        <thead className="bg-[#f8f9fb]">
          <tr>
            <th className={th}>משימה</th>
            <th className={`${th} hidden sm:table-cell border-s w-[34%]`}>הערות</th>
            {archive && <th className={`${th} hidden sm:table-cell border-s w-28`}>מרחב</th>}
            <th className={`${th} border-s w-[76px] ${archive ? "hidden sm:table-cell" : ""}`}>יעד</th>
            <th className={`${th} border-s w-[80px]`}>סטטוס</th>
            {archive && <th className={`${th} border-s w-14`}>בוצע</th>}
            {archive && <th className={`${th} w-9`}><span className="sr-only">מחיקה</span></th>}
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => {
            const sp = archive ? s.spaces.find((x) => x.id === t.space_id) : null;
            return (
              <tr key={t.id} style={{ background: STATUS_META[t.status].bg }}>
                <td className={td}>
                  <Cell label="משימה" value={t.title} singleLine onSave={(title) => s.updateTask(t.id, { title })} className="font-medium leading-snug" />
                  <div className="sm:hidden">
                    <Cell label="הערות" value={t.description} placeholder="+ הערה" onSave={(description) => s.updateTask(t.id, { description })} className="text-[13px] text-ink/70 leading-snug mt-0.5 placeholder:text-gray-300" />
                    {sp && <span className="flex items-center gap-1 text-xs text-muted mt-0.5"><Dot color={sp.color} size={6} />{sp.name}</span>}
                  </div>
                </td>
                <td className={`${td} hidden sm:table-cell border-s`}>
                  <Cell label="הערות" value={t.description} placeholder="" onSave={(description) => s.updateTask(t.id, { description })} className="text-sm text-ink/80 leading-snug" />
                </td>
                {archive && <td className={`${td} hidden sm:table-cell border-s text-sm`}>{sp && <span className="flex items-center gap-1.5"><Dot color={sp.color} />{sp.name}</span>}</td>}
                <td className={`${td} border-s ${archive ? "hidden sm:table-cell" : ""}`}><DueCell t={t} today={s.today} onChange={(p) => s.updateTask(t.id, p)} /></td>
                <td className={`${td} border-s`}><StatusCell status={t.status} onChange={(st) => setStatus(t, st)} /></td>
                {archive && <td className={`${td} border-s text-[13px] whitespace-nowrap`}>{fmtDone(t.completed_at)}</td>}
                {archive && (
                  <td className={`${td} px-0 text-center`}>
                    <button onClick={() => { if (confirm(`למחוק לצמיתות את "${t.title}"?`)) s.deleteTask(t.id); }} aria-label={`מחיקת ${t.title}`} className="grid place-items-center size-7 mx-auto rounded text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="size-3.5" /></button>
                  </td>
                )}
              </tr>
            );
          })}
          {!tasks.length && archive && (
            <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-muted">אין עדיין משימות בארכיון</td></tr>
          )}
        </tbody>
      </table>
      {spaceId && (
        <form onSubmit={add} className="flex items-center gap-1.5 px-2 py-1.5">
          <Plus className="size-4 text-gray-400 shrink-0" />
          <input dir="auto" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="משימה חדשה" aria-label="משימה חדשה" enterKeyHint="done"
            className="flex-1 min-w-0 bg-transparent outline-none text-[15px] py-1 placeholder:text-gray-400" />
        </form>
      )}
    </div>
  );
}
