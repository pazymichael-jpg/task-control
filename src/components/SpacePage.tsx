"use client";
import Link from "next/link";
import { Plus, Settings2 } from "lucide-react";
import { useStore } from "./store";
import { CalendarView, Kanban, TodoList } from "./views";
import { VIEW_ICON } from "./SpaceModal";
import { VIEWS, VIEW_META } from "@/lib/constants";

export default function SpacePage({ id }: { id: string }) {
  const s = useStore();
  const space = s.spaces.find((x) => x.id === id);
  if (!s.loaded) return <div className="py-24 text-center text-muted">טוען…</div>;
  if (!space) return <div className="card p-12 text-center"><p className="font-bold text-lg">המרחב לא נמצא</p><Link href="/" className="btn btn-primary mt-4">לדשבורד</Link></div>;
  const tasks = s.tasks.filter((t) => t.space_id === id);
  const open = tasks.filter((t) => t.status !== "done").length;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <i className="w-1.5 h-10 rounded-full" style={{ background: space.color }} />
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold tracking-tight truncate">{space.name}</h1>
          <p className="text-sm text-muted">{open} פתוחות מתוך {tasks.length}</p>
        </div>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-white border border-line p-1" role="tablist" aria-label="תצוגה">
            {VIEWS.map((v) => {
              const Icon = VIEW_ICON[v]; const on = space.view === v;
              return <button key={v} role="tab" aria-selected={on} onClick={() => s.updateSpace(space.id, { view: v })} title={VIEW_META[v].desc}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition" style={on ? { background: space.color, color: "#fff" } : { color: "#667091" }}>
                <Icon className="size-4" /><span className="hidden md:inline">{VIEW_META[v].label}</span></button>;
            })}
          </div>
          <button onClick={() => s.setSpaceEditor({ mode: "edit", id })} aria-label="הגדרות מרחב" className="btn btn-ghost !p-2.5"><Settings2 className="size-4" /></button>
          <button onClick={() => s.newTask({ space_id: id })} className="btn btn-primary" style={{ background: space.color }}><Plus className="size-4" />משימה חדשה</button>
        </div>
      </div>
      {space.view === "kanban" && <Kanban space={space} tasks={tasks} />}
      {space.view === "todo" && <TodoList space={space} tasks={tasks} />}
      {space.view === "calendar" && <CalendarView space={space} tasks={tasks} />}
    </div>
  );
}
