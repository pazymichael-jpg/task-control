"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Space, Task, View } from "@/lib/constants";

export type EditorState = null | { mode: "edit"; id: string } | { mode: "new"; defaults: Partial<Task> };
export type SpaceEditor = null | { mode: "new" } | { mode: "edit"; id: string };

type Store = {
  spaces: Space[]; tasks: Task[]; today: string; loaded: boolean;
  dashSelected: string[]; setDashSelected: (ids: string[]) => void;
  refresh: () => Promise<void>;
  createTask: (t: Partial<Task>) => Promise<Task | null>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  createSpace: (name: string, color: string, view: View) => Promise<Space | null>;
  updateSpace: (id: string, patch: Partial<Space>) => Promise<void>;
  deleteSpace: (id: string) => Promise<void>;
  editor: EditorState; openTask: (id: string) => void; newTask: (defaults?: Partial<Task>) => void; closeEditor: () => void;
  spaceEditor: SpaceEditor; setSpaceEditor: (s: SpaceEditor) => void;
};
const Ctx = createContext<Store | null>(null);
export const useStore = () => { const c = useContext(Ctx); if (!c) throw new Error("no store"); return c; };

const json = (body: unknown) => ({ headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [today, setToday] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [dash, setDash] = useState<string[] | null>(null);
  const [editor, setEditor] = useState<EditorState>(null);
  const [spaceEditor, setSpaceEditor] = useState<SpaceEditor>(null);
  const busy = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/data", { cache: "no-store" });
      if (r.status === 401) { location.href = "/login"; return; }
      const d = await r.json();
      if (busy.current > 0) return; // don't clobber optimistic updates
      setSpaces(d.spaces); setTasks(d.tasks); setToday(d.today);
      setDash((cur) => cur ?? d.dashboardSpaces ?? null);
      setLoaded(true);
    } catch {}
  }, []);

  useEffect(() => {
    try { const c = localStorage.getItem("dashSelected"); if (c) setDash(JSON.parse(c)); } catch {}
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    const iv = setInterval(refresh, 60000);
    return () => { window.removeEventListener("focus", onFocus); clearInterval(iv); };
  }, [refresh]);

  const dashSelected = useMemo(() => {
    const ids = spaces.map((s) => s.id);
    return dash ? dash.filter((id) => ids.includes(id)) : ids;
  }, [dash, spaces]);
  const setDashSelected = (ids: string[]) => {
    setDash(ids);
    try { localStorage.setItem("dashSelected", JSON.stringify(ids)); } catch {}
    fetch("/api/settings", { method: "PUT", ...json({ dashboardSpaces: ids }) });
  };

  async function mutate<T>(fn: () => Promise<T>): Promise<T> {
    busy.current++;
    try { return await fn(); } finally { busy.current--; }
  }

  const value: Store = {
    spaces, tasks, today, loaded, dashSelected, setDashSelected, refresh,
    createTask: (t) => mutate(async () => {
      const r = await fetch("/api/tasks", { method: "POST", ...json(t) });
      if (!r.ok) return null;
      const created: Task = await r.json();
      setTasks((p) => [...p, created]);
      return created;
    }),
    updateTask: (id, patch) => mutate(async () => {
      const prev = tasks;
      const now = new Date().toISOString().slice(0, 19);
      setTasks((p) => p.map((t) => t.id === id ? { ...t, ...patch, completed_at: patch.status ? (patch.status === "done" ? t.completed_at ?? now : null) : t.completed_at } : t));
      const r = await fetch(`/api/tasks/${id}`, { method: "PATCH", ...json(patch) });
      if (!r.ok) { setTasks(prev); return; }
      const saved: Task = await r.json();
      setTasks((p) => p.map((t) => t.id === id ? saved : t));
    }),
    deleteTask: (id) => mutate(async () => {
      setTasks((p) => p.filter((t) => t.id !== id));
      await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    }),
    createSpace: (name, color, view) => mutate(async () => {
      const r = await fetch("/api/spaces", { method: "POST", ...json({ name, color, view }) });
      if (!r.ok) return null;
      const s: Space = await r.json();
      setSpaces((p) => [...p, s]);
      setDash((cur) => (cur ? [...cur, s.id] : cur));
      return s;
    }),
    updateSpace: (id, patch) => mutate(async () => {
      setSpaces((p) => p.map((s) => s.id === id ? { ...s, ...patch } : s));
      await fetch(`/api/spaces/${id}`, { method: "PATCH", ...json(patch) });
    }),
    deleteSpace: (id) => mutate(async () => {
      setSpaces((p) => p.filter((s) => s.id !== id));
      setTasks((p) => p.filter((t) => t.space_id !== id));
      await fetch(`/api/spaces/${id}`, { method: "DELETE" });
    }),
    editor, openTask: (id) => setEditor({ mode: "edit", id }), newTask: (defaults = {}) => setEditor({ mode: "new", defaults }), closeEditor: () => setEditor(null),
    spaceEditor, setSpaceEditor,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
