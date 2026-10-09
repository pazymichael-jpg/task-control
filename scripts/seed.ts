import { config } from "dotenv";
config({ path: [".env.local", ".env"] });
import { ensureSchema, query, closePool } from "../src/lib/db";
import { addDays, todayStr } from "../src/lib/dates";
import type { Priority, Status, View } from "../src/lib/constants";

const force = process.argv.includes("--force");
const t = todayStr();
const d = (n: number) => addDays(t, n);

type Seed = { name: string; color: string; view: View; tasks: [string, Priority, Status, number | null, string?][] };
const DATA: Seed[] = [
  { name: "בית", color: "#059669", view: "todo", tasks: [
    ["לשלם ארנונה", "urgent", "new", 1, "החשבון במייל, תשלום באשראי"],
    ["לקנות חלב וביצים", "medium", "new", 0],
    ["להתקשר לסבתא", "high", "new", 1],
    ["לתקן את הברז במטבח", "medium", "on_hold", 6, "מחכה לחלק חילוף"],
    ["לסדר את המחסן", "low", "new", 12],
    ["לשלוח מתנה ליום הולדת", "medium", "done", -2],
  ] },
  { name: "עבודה", color: "#4F46E5", view: "kanban", tasks: [
    ["להגיש הצעת מחיר ללקוח חדש", "urgent", "in_progress", 0, "לצרף את הפורטפוליו המעודכן"],
    ["לעדכן את דף הנחיתה", "high", "in_progress", 3],
    ["פגישת צוות שבועית", "medium", "new", 2],
    ["לשלוח חשבוניות לחודש שעבר", "high", "new", -2, "באיחור, לסגור היום"],
    ["לסכם את הרבעון", "low", "done", -3],
  ] },
  { name: "לימודים", color: "#7C3AED", view: "calendar", tasks: [
    ["להגיש עבודה בסטטיסטיקה", "urgent", "in_progress", 4],
    ["לקרוא פרק 5 בספר", "medium", "new", -1],
    ["להתכונן למבחן באלגברה", "high", "new", 9],
    ["לשבת בקבוצת לימוד", "low", "on_hold", 7],
    ["לרכז סיכום מהרצאה", "medium", "done", -4],
  ] },
];

async function main() {
  await ensureSchema();
  const existing = await query<{ n: number }>("SELECT count(*) AS n FROM spaces");
  if (existing[0].n > 0 && !force) { console.log("DB already has spaces - skipping seed (use --force to reset)"); return closePool(); }
  if (force) { await query("DELETE FROM tasks"); await query("DELETE FROM spaces"); await query("DELETE FROM settings"); }
  let i = 0;
  for (const s of DATA) {
    const [sp] = await query<{ id: string }>("INSERT INTO spaces(name,color,view,sort) VALUES ($1,$2,$3,$4) RETURNING id", [s.name, s.color, s.view, i++]);
    for (const [title, priority, status, off, desc] of s.tasks) {
      await query(
        `INSERT INTO tasks(space_id,title,description,priority,status,due_date,completed_at) VALUES ($1,$2,$3,$4,$5,$6, CASE WHEN $5='done' THEN now() - interval '1 day' END)`,
        [sp.id, title, desc ?? "", priority, status, off === null ? null : d(off)]
      );
    }
  }
  console.log("Seeded 3 spaces and", DATA.reduce((n, s) => n + s.tasks.length, 0), "tasks");
  await closePool();
}
main().catch((e) => { console.error(e); process.exit(1); });
