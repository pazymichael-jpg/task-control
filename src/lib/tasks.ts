import { query } from "./db";
import { PRIORITIES, STATUSES, VIEWS, type Space, type Task, type Priority, type Status, type View } from "./constants";

const TASK_COLS = `id, space_id, title, description, priority, status, due_date,
  to_char(created_at at time zone 'Asia/Jerusalem','YYYY-MM-DD"T"HH24:MI:SS') as created_at,
  to_char(completed_at at time zone 'Asia/Jerusalem','YYYY-MM-DD"T"HH24:MI:SS') as completed_at`;

export async function listSpaces(): Promise<Space[]> {
  return query<Space>("SELECT id, name, color, view, sort FROM spaces ORDER BY sort, created_at");
}
export async function listTasks(): Promise<Task[]> {
  return query<Task>(`SELECT ${TASK_COLS} FROM tasks ORDER BY created_at`);
}
export async function getTask(id: string): Promise<Task | null> {
  const r = await query<Task>(`SELECT ${TASK_COLS} FROM tasks WHERE id=$1`, [id]);
  return r[0] ?? null;
}

const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

export type TaskInput = Partial<{ space_id: string; title: string; description: string; priority: Priority; status: Status; due_date: string | null }>;

export function cleanTaskInput(b: any): TaskInput {
  const o: TaskInput = {};
  if (typeof b.space_id === "string") o.space_id = b.space_id;
  if (typeof b.title === "string") o.title = b.title.trim().slice(0, 300);
  if (typeof b.description === "string") o.description = b.description.slice(0, 5000);
  if (PRIORITIES.includes(b.priority)) o.priority = b.priority;
  if (STATUSES.includes(b.status)) o.status = b.status;
  if ("due_date" in b) o.due_date = isDate(b.due_date) ? b.due_date : null;
  return o;
}

export async function createTask(i: TaskInput): Promise<Task> {
  if (!i.space_id || !i.title) throw new Error("חסרים מרחב או כותרת");
  const status = i.status ?? "new";
  const r = await query<Task>(
    `INSERT INTO tasks (space_id,title,description,priority,status,due_date,completed_at)
     VALUES ($1,$2,$3,$4,$5,$6, CASE WHEN $5='done' THEN now() END) RETURNING ${TASK_COLS}`,
    [i.space_id, i.title, i.description ?? "", i.priority ?? "medium", status, i.due_date ?? null]
  );
  return r[0];
}

export async function updateTask(id: string, i: TaskInput): Promise<Task | null> {
  const sets: string[] = []; const vals: any[] = [];
  const add = (col: string, v: any) => { vals.push(v); sets.push(`${col}=$${vals.length}`); };
  if (i.space_id !== undefined) add("space_id", i.space_id);
  if (i.title !== undefined && i.title) add("title", i.title);
  if (i.description !== undefined) add("description", i.description);
  if (i.priority !== undefined) add("priority", i.priority);
  if (i.due_date !== undefined) add("due_date", i.due_date);
  if (i.status !== undefined) {
    add("status", i.status);
    sets.push(i.status === "done" ? "completed_at=COALESCE(completed_at, now())" : "completed_at=NULL");
  }
  if (!sets.length) return getTask(id);
  sets.push("updated_at=now()");
  vals.push(id);
  const r = await query<Task>(`UPDATE tasks SET ${sets.join(",")} WHERE id=$${vals.length} RETURNING ${TASK_COLS}`, vals);
  return r[0] ?? null;
}
export async function deleteTask(id: string) { await query("DELETE FROM tasks WHERE id=$1", [id]); }
export async function deleteTasks(ids: string[]) { if (ids.length) await query("DELETE FROM tasks WHERE id = ANY($1::uuid[])", [ids]); }

export async function createSpace(name: string, color: string, view: View): Promise<Space> {
  const r = await query<Space>(
    `INSERT INTO spaces (name,color,view,sort) VALUES ($1,$2,$3,(SELECT COALESCE(MAX(sort),0)+1 FROM spaces)) RETURNING id,name,color,view,sort`,
    [name.trim().slice(0, 60), color, VIEWS.includes(view) ? view : "todo"]
  );
  return r[0];
}
export async function updateSpace(id: string, b: Partial<{ name: string; color: string; view: View }>) {
  const sets: string[] = []; const vals: any[] = [];
  if (b.name?.trim()) { vals.push(b.name.trim().slice(0, 60)); sets.push(`name=$${vals.length}`); }
  if (b.color) { vals.push(b.color); sets.push(`color=$${vals.length}`); }
  if (b.view && VIEWS.includes(b.view)) { vals.push(b.view); sets.push(`view=$${vals.length}`); }
  if (!sets.length) return;
  vals.push(id);
  await query(`UPDATE spaces SET ${sets.join(",")} WHERE id=$${vals.length}`, vals);
}
export async function deleteSpace(id: string) { await query("DELETE FROM spaces WHERE id=$1", [id]); }

export async function getSetting<T>(key: string): Promise<T | null> {
  const r = await query<{ value: T }>("SELECT value FROM settings WHERE key=$1", [key]);
  return r[0]?.value ?? null;
}
export async function setSetting(key: string, value: unknown) {
  await query("INSERT INTO settings(key,value) VALUES ($1,$2::jsonb) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [key, JSON.stringify(value)]);
}
