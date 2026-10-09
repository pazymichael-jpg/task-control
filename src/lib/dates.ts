const TZ = "Asia/Jerusalem";
export function todayStr(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
export function israelHour(d = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(d)) % 24;
}
export function addDays(s: string, n: number): string {
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}
export function weekdayOf(s: string): number {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sunday
}
export function weekStart(s: string): string { return addDays(s, -weekdayOf(s)); }
export const WEEKDAYS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
export function formatDateHe(s: string, withWeekday = false): string {
  const [y, m, d] = s.split("-").map(Number);
  return new Intl.DateTimeFormat("he-IL", { timeZone: "UTC", day: "numeric", month: "long", ...(withWeekday ? { weekday: "long" } : {}) }).format(new Date(Date.UTC(y, m - 1, d)));
}
export function formatShort(s: string): string {
  const [, m, d] = s.split("-").map(Number);
  return `${d}/${m}`;
}
export function relativeLabel(s: string | null, today: string): string {
  if (!s) return "ללא תאריך";
  if (s === today) return "היום";
  if (s === addDays(today, 1)) return "מחר";
  if (s === addDays(today, -1)) return "אתמול";
  return formatShort(s);
}
