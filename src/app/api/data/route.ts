import { NextResponse } from "next/server";
import { listSpaces, listTasks } from "@/lib/tasks";
import { todayStr } from "@/lib/dates";

export const dynamic = "force-dynamic";
export async function GET() {
  const [spaces, tasks] = await Promise.all([listSpaces(), listTasks()]);
  return NextResponse.json({ spaces, tasks, today: todayStr() }, { headers: { "Cache-Control": "no-store" } });
}
