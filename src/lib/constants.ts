export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];
export const STATUSES = ["new", "in_progress", "on_hold", "done"] as const;
export type Status = (typeof STATUSES)[number];
export const VIEWS = ["kanban", "todo", "calendar"] as const;
export type View = (typeof VIEWS)[number];

export const PRIORITY_META: Record<Priority, { label: string; color: string; bg: string; rank: number }> = {
  low: { label: "נמוכה", color: "#2563EB", bg: "#DBEAFE", rank: 1 },
  medium: { label: "בינונית", color: "#A16207", bg: "#FEF08A", rank: 2 },
  high: { label: "גבוהה", color: "#C2410C", bg: "#FFEDD5", rank: 3 },
  urgent: { label: "דחוף", color: "#DC2626", bg: "#FEE2E2", rank: 4 },
};
export const STATUS_META: Record<Status, { label: string; color: string; bg: string }> = {
  new: { label: "חדשה", color: "#475569", bg: "#E2E8F0" },
  in_progress: { label: "בעבודה", color: "#4F46E5", bg: "#E0E7FF" },
  on_hold: { label: "בהשהייה", color: "#B45309", bg: "#FEF3C7" },
  done: { label: "הושלמה", color: "#15803D", bg: "#DCFCE7" },
};
export const VIEW_META: Record<View, { label: string; desc: string }> = {
  kanban: { label: "קנבן", desc: "עמודות לפי סטטוס, עם גרירה" },
  todo: { label: "רשימת TODO", desc: "רשימה לפי עדיפות עם וי" },
  calendar: { label: "לוח שנה", desc: "חודש שלם לפי תאריך יעד" },
};
export const SPACE_COLORS = ["#4F46E5", "#0D9488", "#7C3AED", "#DB2777", "#059669", "#0284C7", "#D97706", "#64748B"];

export type Space = { id: string; name: string; color: string; view: View; sort: number };
export type Task = {
  id: string; space_id: string; title: string; description: string;
  priority: Priority; status: Status; due_date: string | null;
  created_at: string; completed_at: string | null;
};
