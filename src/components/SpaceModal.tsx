"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Trash2 } from "lucide-react";
import { useStore } from "./store";
import { Modal } from "./ui";
import { SPACE_COLORS } from "@/lib/constants";

export default function SpaceModal() {
  const s = useStore();
  const e = s.spaceEditor;
  if (!e) return null;
  const sp = e.mode === "edit" ? s.spaces.find((x) => x.id === e.id) : null;
  if (e.mode === "edit" && !sp) return null;
  return <Form key={sp?.id ?? "new"} space={sp ?? null} />;
}

function Form({ space }: { space: { id: string; name: string; color: string } | null }) {
  const s = useStore(); const router = useRouter();
  const [name, setName] = useState(space?.name ?? "");
  const [color, setColor] = useState(space?.color ?? SPACE_COLORS[s.spaces.length % SPACE_COLORS.length]);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const close = () => s.setSpaceEditor(null);
  const taskCount = space ? s.tasks.filter((t) => t.space_id === space.id).length : 0;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    if (space) { await s.updateSpace(space.id, { name: name.trim(), color }); close(); }
    else { const c = await s.createSpace(name.trim(), color); close(); if (c) router.push(`/space/${c.id}`); }
  }
  return (
    <Modal title={space ? "עריכת מרחב" : "מרחב חדש"} onClose={close}>
      <form onSubmit={save} className="px-5 pb-5 space-y-4">
        <div>
          <label className="label" htmlFor="sp-name">שם המרחב</label>
          <input id="sp-name" dir="auto" autoFocus value={name} onChange={(e) => setName(e.target.value)} className="field text-base font-semibold" placeholder="למשל: פרטי, עבודה" />
        </div>
        <div>
          <span className="label">צבע</span>
          <div className="flex flex-wrap gap-2.5">
            {SPACE_COLORS.map((c) => (
              <button key={c} type="button" aria-label={c} onClick={() => setColor(c)} className="size-8 rounded-full grid place-items-center ring-offset-2 transition" style={{ background: c, boxShadow: color === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : undefined }}>
                {color === c && <Check className="size-4 text-white" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-primary" disabled={busy || !name.trim()}>{busy ? <Loader2 className="size-4 animate-spin" /> : space ? "שמירה" : "יצירת מרחב"}</button>
          <button type="button" className="btn btn-ghost" onClick={close}>ביטול</button>
          {space && (
            <button type="button" className="btn btn-danger ms-auto" onClick={async () => { if (!confirmDel) return setConfirmDel(true); close(); router.push("/"); await s.deleteSpace(space.id); }}>
              <Trash2 className="size-4" />{confirmDel ? (taskCount ? `מחיקה סופית (${taskCount})` : "מחיקה סופית") : "מחיקה"}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
