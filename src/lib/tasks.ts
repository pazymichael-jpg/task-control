import { query } from "./db";
import { deleteEvent, upsertEvent } from "./gcal";
import { STATUSES, type Space, type Task, type Status } from "./constants";

const TASK_COLS = `id, space_id, title, description, status, due_date, due_time,
  to_char(created_at at time zone 'Asia/Jerusalem','YYYY-MM-DD"T"HH24:MI:SS') as created_at,
  to_char(completed_at at time zone 'Asia/Jerusalem','YYYY-MM-DD"T"HH24:MI:SS') as completed_at`;

export async function listSpaces(): Promise<Space[]> {
  return query<Space>("SELECT id, name, color, sort FROM spaces ORDER BY sort, created_at");
}
export async function listTasks(): Promise<Task[]> {
  return query<Task>(`SELECT ${TASK_COLS} FROM tasks ORDER BY created_at`);
}
export async function getTask(id: string): Promise<Task | null> {
  const r = await query<Task>(`SELECT ${TASK_COLS} FROM tasks WHERE id=$1`, [id]);
  return r[0] ?? null;
}

export const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
export const isTime = (s: unknown): s is string => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

export type TaskInput = Partial<{ space_id: string; title: string; description: string; status: Status; due_date: string | null; due_time: string | null }>;

export function cleanTaskInput(b: any): TaskInput {
  const o: TaskInput = {};
  if (typeof b.space_id === "string") o.space_id = b.space_id;
  if (typeof b.title === "string") o.title = b.title.trim().slice(0, 300);
  if (typeof b.description === "string") o.description = b.description.slice(0, 5000);
  if (STATUSES.includes(b.status)) o.status = b.status;
  if ("due_date" in b) o.due_date = isDate(b.due_date) ? b.due_date : null;
  if ("due_time" in b) o.due_time = isTime(b.due_time) ? b.due_time : null;
  return o;
}

/* Keeps the Google Calendar event in step with the task: timed + not cancelled → event, otherwise none. */
async function syncCalendar(id: string) {
  try {
    const r = await query<Task & { gcal_event_id: string | null; space: string }>(
      `SELECT t.title, t.description, t.status, t.due_date, t.due_time, t.gcal_event_id, s.name AS space FROM tasks t JOIN spaces s ON s.id=t.space_id WHERE t.id=$1`, [id]);
    const t = r[0];
    if (!t) return;
    const wanted = t.status !== "cancelled" && !!t.due_date && !!t.due_time;
    if (!wanted) {
      if (t.gcal_event_id) { await deleteEvent(t.gcal_event_id); await query("UPDATE tasks SET gcal_event_id=NULL WHERE id=$1", [id]); }
      return;
    }
    const ev = await upsertEvent(t.gcal_event_id, { title: t.title, description: t.description, due_date: t.due_date!, due_time: t.due_time!, space: t.space });
    if (ev !== t.gcal_event_id) await query("UPDATE tasks SET gcal_event_id=$2 WHERE id=$1", [id, ev]);
  } catch (e) { console.error("calendar sync failed", e); }
}

export async function createTask(i: TaskInput): Promise<Task> {
  if (!i.space_id || !i.title) throw new Error("חסרים מרחב או משימה");
  const status = i.status ?? "new";
  const r = await query<Task>(
    `INSERT INTO tasks (space_id,title,description,status,due_date,due_time,completed_at)
     VALUES ($1,$2,$3,$4,$5,$6, CASE WHEN $4 IN ('done','cancelled') THEN now() END) RETURNING ${TASK_COLS}`,
    [i.space_id, i.title, i.description ?? "", status, i.due_date ?? null, i.due_date ? i.due_time ?? null : null]
  );
  if (r[0].due_time) await syncCalendar(r[0].id);
  return r[0];
}

export async function updateTask(id: string, i: TaskInput): Promise<Task | null> {
  const sets: string[] = []; const vals: any[] = [];
  const add = (col: string, v: any) => { vals.push(v); sets.push(`${col}=$${vals.length}`); };
  if (i.space_id !== undefined) add("space_id", i.space_id);
  if (i.title !== undefined && i.title) add("title", i.title);
  if (i.description !== undefined) add("description", i.description);
  if (i.due_date !== undefined) { add("due_date", i.due_date); if (!i.due_date) sets.push("due_time=NULL"); }
  if (i.due_time !== undefined && (i.due_date !== null)) add("due_time", i.due_time);
  if (i.status !== undefined) {
    add("status", i.status);
    sets.push(i.status === "done" || i.status === "cancelled" ? "completed_at=COALESCE(completed_at, now())" : "completed_at=NULL");
  }
  if (!sets.length) return getTask(id);
  sets.push("updated_at=now()");
  vals.push(id);
  const r = await query<Task & { gcal_event_id: string | null }>(`UPDATE tasks SET ${sets.join(",")} WHERE id=$${vals.length} RETURNING ${TASK_COLS}, gcal_event_id`, vals);
  if (!r[0]) return null;
  const { gcal_event_id, ...task } = r[0];
  if (gcal_event_id || task.due_time) await syncCalendar(id);
  return task;
}

async function dropEvents(where: string, param: unknown) {
  const rows = await query<{ gcal_event_id: string }>(`SELECT gcal_event_id FROM tasks WHERE gcal_event_id IS NOT NULL AND ${where}`, [param]);
  await Promise.all(rows.map((r) => deleteEvent(r.gcal_event_id).catch((e) => console.error("calendar delete failed", e))));
}
export async function deleteTask(id: string) { await dropEvents("id=$1", id); await query("DELETE FROM tasks WHERE id=$1", [id]); }
export async function deleteTasks(ids: string[]) {
  if (!ids.length) return;
  await dropEvents("id = ANY($1::uuid[])", ids);
  await query("DELETE FROM tasks WHERE id = ANY($1::uuid[])", [ids]);
}

export async function createSpace(name: string, color: string): Promise<Space> {
  const r = await query<Space>(
    `INSERT INTO spaces (name,color,sort) VALUES ($1,$2,(SELECT COALESCE(MAX(sort),0)+1 FROM spaces)) RETURNING id,name,color,sort`,
    [name.trim().slice(0, 60), color]
  );
  return r[0];
}
export async function updateSpace(id: string, b: Partial<{ name: string; color: string }>) {
  const sets: string[] = []; const vals: any[] = [];
  if (b.name?.trim()) { vals.push(b.name.trim().slice(0, 60)); sets.push(`name=$${vals.length}`); }
  if (b.color) { vals.push(b.color); sets.push(`color=$${vals.length}`); }
  if (!sets.length) return;
  vals.push(id);
  await query(`UPDATE spaces SET ${sets.join(",")} WHERE id=$${vals.length}`, vals);
}
export async function deleteSpace(id: string) { await dropEvents("space_id=$1", id); await query("DELETE FROM spaces WHERE id=$1", [id]); }
