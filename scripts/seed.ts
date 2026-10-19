import { config } from "dotenv";
config({ path: [".env.local", ".env"] });
import { ensureSchema, query, closePool } from "../src/lib/db";
import { addDays, todayStr } from "../src/lib/dates";
import type { Status } from "../src/lib/constants";

const force = process.argv.includes("--force");
const t = todayStr();
const d = (n: number) => addDays(t, n);

type Seed = { name: string; color: string; tasks: [string, Status, number | null, string?][] };
const DATA: Seed[] = [
  { name: "פרטי", color: "#059669", tasks: [
    ["לשלם ארנונה", "new", 1, "החשבון במייל, תשלום באשראי"],
    ["לקנות חלב וביצים", "new", 0],
    ["להתקשר לסבתא", "in_progress", 1],
    ["לתקן את הברז במטבח", "in_progress", 6, "מחכה לחלק חילוף"],
    ["לשלוח מתנה ליום הולדת", "done", -2],
  ] },
  { name: "עבודה", color: "#4F46E5", tasks: [
    ["להגיש הצעת מחיר ללקוח חדש", "in_progress", 0, "לצרף את הפורטפוליו המעודכן"],
    ["לעדכן את דף הנחיתה", "new", 3],
    ["לשלוח חשבוניות לחודש שעבר", "new", -2],
    ["לסכם את הרבעון", "done", -3],
    ["פגישה שבוטלה", "cancelled", -1],
  ] },
];

async function main() {
  await ensureSchema();
  const existing = await query<{ n: number }>("SELECT count(*) AS n FROM spaces");
  if (existing[0].n > 0 && !force) { console.log("DB already has spaces - skipping seed (use --force to reset)"); return closePool(); }
  if (force) { await query("DELETE FROM tasks"); await query("DELETE FROM spaces"); await query("DELETE FROM settings"); }
  let i = 0;
  for (const s of DATA) {
    const [sp] = await query<{ id: string }>("INSERT INTO spaces(name,color,sort) VALUES ($1,$2,$3) RETURNING id", [s.name, s.color, i++]);
    for (const [title, status, off, desc] of s.tasks) {
      await query(
        `INSERT INTO tasks(space_id,title,description,status,due_date,completed_at) VALUES ($1,$2,$3,$4,$5, CASE WHEN $4 IN ('done','cancelled') THEN now() - interval '1 day' END)`,
        [sp.id, title, desc ?? "", status, off === null ? null : d(off)]
      );
    }
  }
  console.log(`Seeded ${DATA.length} spaces and`, DATA.reduce((n, s) => n + s.tasks.length, 0), "tasks");
  await closePool();
}
main().catch((e) => { console.error(e); process.exit(1); });
