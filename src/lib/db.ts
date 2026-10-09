import { Pool, types } from "pg";

types.setTypeParser(1082, (v) => v); // DATE as 'YYYY-MM-DD'
types.setTypeParser(20, (v) => Number(v)); // bigint count

const g = globalThis as unknown as { __pool?: Pool; __schema?: Promise<void> };

function pool(): Pool {
  if (!g.__pool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
    g.__pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  }
  return g.__pool;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#4F46E5',
  view text NOT NULL DEFAULT 'todo',
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'new',
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS tasks_space_idx ON tasks(space_id);
CREATE TABLE IF NOT EXISTS settings (key text PRIMARY KEY, value jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS pending_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL DEFAULT 'web',
  chat_ref text,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS processed_messages (id text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
`;

export async function ensureSchema() {
  if (!g.__schema) {
    g.__schema = pool().query(SCHEMA).then(() => undefined).catch((e) => { g.__schema = undefined; throw e; });
  }
  return g.__schema;
}

export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  await ensureSchema();
  const r = await pool().query(text, params);
  return r.rows as T[];
}
export async function closePool() { await g.__pool?.end(); g.__pool = undefined; }
