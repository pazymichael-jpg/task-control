"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { isClosed, type Space, type Task } from "@/lib/constants";

export type SpaceEditor = null | { mode: "new" } | { mode: "edit"; id: string };
export type Toast = null | { id: number; text: string; undo?: () => void };

type Store = {
  spaces: Space[]; tasks: Task[]; today: string; loaded: boolean;
  refresh: () => Promise<void>;
  createTask: (t: Partial<Task>) => Promise<Task | null>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  createSpace: (name: string, color: string) => Promise<Space | null>;
  updateSpace: (id: string, patch: Partial<Space>) => Promise<void>;
  deleteSpace: (id: string) => Promise<void>;
  spaceEditor: SpaceEditor; setSpaceEditor: (s: SpaceEditor) => void;
  toast: Toast; showToast: (text: string, undo?: () => void) => void;
};
const Ctx = createContext<Store | null>(null);
export const useStore = () => { const c = useContext(Ctx); if (!c) throw new Error("no store"); return c; };

const json = (body: unknown) => ({ headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [today, setToday] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [spaceEditor, setSpaceEditor] = useState<SpaceEditor>(null);
  const [toast, setToast] = useState<Toast>(null);
  const busy = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/data", { cache: "no-store" });
      if (r.status === 401) { location.href = "/login"; return; }
      const d = await r.json();
      if (busy.current > 0) return; // don't clobber optimistic updates
      setSpaces(d.spaces); setTasks(d.tasks); setToday(d.today);
      setLoaded(true);
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    const iv = setInterval(refresh, 60000);
    return () => { window.removeEventListener("focus", onFocus); clearInterval(iv); };
  }, [refresh]);

  const showToast = (text: string, undo?: () => void) => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text, undo });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  };

  async function mutate<T>(fn: () => Promise<T>): Promise<T> {
    busy.current++;
    try { return await fn(); } finally { busy.current--; }
  }

  const value: Store = {
    spaces, tasks, today, loaded, refresh,
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
      setTasks((p) => p.map((t) => t.id === id ? { ...t, ...patch, completed_at: patch.status ? (isClosed(patch.status) ? t.completed_at ?? now : null) : t.completed_at } : t));
      const r = await fetch(`/api/tasks/${id}`, { method: "PATCH", ...json(patch) });
      if (!r.ok) { setTasks(prev); return; }
      const saved: Task = await r.json();
      setTasks((p) => p.map((t) => t.id === id ? saved : t));
    }),
    deleteTask: (id) => mutate(async () => {
      setTasks((p) => p.filter((t) => t.id !== id));
      await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    }),
    createSpace: (name, color) => mutate(async () => {
      const r = await fetch("/api/spaces", { method: "POST", ...json({ name, color }) });
      if (!r.ok) return null;
      const s: Space = await r.json();
      setSpaces((p) => [...p, s]);
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
    spaceEditor, setSpaceEditor, toast, showToast,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
