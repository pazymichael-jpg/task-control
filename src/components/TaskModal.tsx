"use client";
import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useStore } from "./store";
import { Modal, Segmented } from "./ui";
import { PRIORITIES, PRIORITY_META, STATUSES, STATUS_META, type Priority, type Status } from "@/lib/constants";

export default function TaskModal() {
  const s = useStore();
  const { editor, closeEditor } = s;
  if (!editor) return null;
  const existing = editor.mode === "edit" ? s.tasks.find((t) => t.id === editor.id) : null;
  if (editor.mode === "edit" && !existing) return null;
  const d: Partial<import("@/lib/constants").Task> = existing ?? (editor.mode === "new" ? editor.defaults : {});
  return <Form key={existing?.id ?? "new"} initial={{
    title: d.title ?? "", description: d.description ?? "", priority: d.priority ?? "medium", status: d.status ?? "new",
    due_date: d.due_date ?? "", space_id: d.space_id ?? s.spaces[0]?.id ?? "",
  }} id={existing?.id} onClose={closeEditor} />;
}

function Form({ initial, id, onClose }: { initial: { title: string; description: string; priority: Priority; status: Status; due_date: string; space_id: string }; id?: string; onClose: () => void }) {
  const s = useStore();
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const space = s.spaces.find((x) => x.id === f.space_id);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) return;
    setSaving(true);
    const body = { ...f, title: f.title.trim(), due_date: f.due_date || null };
    if (id) await s.updateTask(id, body); else await s.createTask(body);
    onClose();
  }
  return (
    <Modal title={id ? "עריכת משימה" : "משימה חדשה"} onClose={onClose}>
      <form onSubmit={save} className="px-6 pb-6 space-y-4">
        <div>
          <label className="label" htmlFor="t-title">כותרת</label>
          <input id="t-title" dir="auto" autoFocus={!id} value={f.title} onChange={(e) => set("title", e.target.value)} className="field text-base font-semibold" placeholder="מה צריך לעשות?" />
        </div>
        <div>
          <label className="label">עדיפות</label>
          <Segmented value={f.priority} onChange={(v) => set("priority", v)} options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label, color: PRIORITY_META[p].color, bg: PRIORITY_META[p].bg }))} />
        </div>
        <div>
          <label className="label">סטטוס</label>
          <Segmented value={f.status} onChange={(v) => set("status", v)} options={STATUSES.map((p) => ({ value: p, label: STATUS_META[p].label, color: STATUS_META[p].color, bg: STATUS_META[p].bg }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="t-due">תאריך יעד</label>
            <div className="flex gap-2">
              <input id="t-due" type="date" value={f.due_date} onChange={(e) => set("due_date", e.target.value)} className="field min-w-0" />
            </div>
            {f.due_date && <button type="button" onClick={() => set("due_date", "")} className="text-xs text-muted hover:text-ink mt-1">הסרת תאריך</button>}
          </div>
          <div>
            <label className="label" htmlFor="t-space">מרחב</label>
            <div className="relative">
              <select id="t-space" value={f.space_id} onChange={(e) => set("space_id", e.target.value)} className="field appearance-none ps-8">
                {s.spaces.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
              <i className="absolute top-1/2 -translate-y-1/2 start-3 size-2.5 rounded-full pointer-events-none" style={{ background: space?.color }} />
            </div>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="t-desc">פרטים</label>
          <textarea id="t-desc" dir="auto" rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} className="field resize-none" placeholder="הערות, קישורים, מה חשוב לזכור…" />
        </div>
        <div className="flex items-center gap-2 pt-2">
          <button className="btn btn-primary" disabled={saving || !f.title.trim()}>{saving ? <Loader2 className="size-4 animate-spin" /> : id ? "שמירה" : "הוספת משימה"}</button>
          <button type="button" onClick={onClose} className="btn btn-ghost">ביטול</button>
          {id && (
            <button type="button" className="btn btn-danger ms-auto" onClick={async () => { if (!confirmDel) return setConfirmDel(true); await s.deleteTask(id); onClose(); }}>
              <Trash2 className="size-4" />{confirmDel ? "בטוח? לחץ שוב" : "מחיקה"}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
