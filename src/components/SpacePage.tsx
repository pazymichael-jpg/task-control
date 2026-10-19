"use client";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { useStore } from "./store";
import TaskTable from "./TaskTable";
import { Dot } from "./ui";
import { isClosed, type Space, type Task } from "@/lib/constants";

// Open tasks: by due date (undated last), then time, then creation.
export const byDue = (a: Task, b: Task) =>
  (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || (a.due_time ?? "99").localeCompare(b.due_time ?? "99") || a.created_at.localeCompare(b.created_at);

function Section({ space, heading }: { space: Space; heading?: "h1" | "h2" }) {
  const s = useStore();
  const tasks = s.tasks.filter((t) => t.space_id === space.id && !isClosed(t.status)).sort(byDue);
  const H = heading ?? "h2";
  return (
    <section>
      <div className="flex items-center gap-2 mb-1.5 px-0.5">
        <H className={`flex items-center gap-2 font-bold ${H === "h1" ? "text-lg" : "text-base"}`}><Dot color={space.color} />{space.name}</H>
        <span className="text-xs text-muted">{tasks.length}</span>
        <button onClick={() => s.setSpaceEditor({ mode: "edit", id: space.id })} aria-label={`עריכת המרחב ${space.name}`} title="עריכה ומחיקה" className="grid place-items-center size-7 rounded-md text-gray-400 hover:text-ink hover:bg-gray-100"><Pencil className="size-3.5" /></button>
      </div>
      <TaskTable tasks={tasks} spaceId={space.id} />
    </section>
  );
}

export function AllSpaces() {
  const s = useStore();
  if (!s.loaded) return <p className="py-16 text-center text-muted">טוען…</p>;
  if (!s.spaces.length) return (
    <div className="py-16 text-center">
      <p className="font-bold">אין עדיין מרחבים</p>
      <button onClick={() => s.setSpaceEditor({ mode: "new" })} className="btn btn-primary mt-3">יצירת מרחב</button>
    </div>
  );
  return <div className="space-y-6">{s.spaces.map((sp) => <Section key={sp.id} space={sp} />)}</div>;
}

export default function SpacePage({ id }: { id: string }) {
  const s = useStore();
  const space = s.spaces.find((x) => x.id === id);
  if (!s.loaded) return <p className="py-16 text-center text-muted">טוען…</p>;
  if (!space) return <div className="py-16 text-center"><p className="font-bold">המרחב לא נמצא</p><Link href="/" className="btn btn-primary mt-3">לכל המרחבים</Link></div>;
  return <Section space={space} heading="h1" />;
}

export function ArchivePage() {
  const s = useStore();
  if (!s.loaded) return <p className="py-16 text-center text-muted">טוען…</p>;
  const tasks = s.tasks.filter((t) => isClosed(t.status)).sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
  return (
    <section>
      <div className="flex items-center gap-2 mb-1.5 px-0.5"><h1 className="font-bold text-lg">בוצעו ובוטלו</h1><span className="text-xs text-muted">{tasks.length}</span></div>
      <p className="text-xs text-muted mb-2 px-0.5">שינוי סטטוס ל"לא החל" או "בתהליך" מחזיר את המשימה למרחב שלה.</p>
      <TaskTable tasks={tasks} archive />
    </section>
  );
}
