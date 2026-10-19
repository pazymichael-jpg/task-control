export const STATUSES = ["new", "in_progress", "done", "cancelled"] as const;
export type Status = (typeof STATUSES)[number];
export const CLOSED: readonly Status[] = ["done", "cancelled"];
export const isClosed = (s: Status) => CLOSED.includes(s);

// Row background per status (Excel-style).
export const STATUS_META: Record<Status, { label: string; bg: string; ink: string }> = {
  new: { label: "לא החל", bg: "#ffffff", ink: "#4b5563" },
  in_progress: { label: "בתהליך", bg: "#fef9c3", ink: "#854d0e" },
  done: { label: "בוצע", bg: "#dcfce7", ink: "#166534" },
  cancelled: { label: "בוטלה", bg: "#fee2e2", ink: "#991b1b" },
};
export const SPACE_COLORS = ["#4F46E5", "#0D9488", "#7C3AED", "#DB2777", "#059669", "#0284C7", "#D97706", "#64748B"];

export type Space = { id: string; name: string; color: string; sort: number };
export type Task = {
  id: string; space_id: string; title: string; description: string; // description = הערות
  status: Status; due_date: string | null; due_time: string | null;
  created_at: string; completed_at: string | null;
};
