import { NextResponse } from "next/server";
import { getSetting, listSpaces, listTasks } from "@/lib/tasks";
import { todayStr } from "@/lib/dates";

export const dynamic = "force-dynamic";
export async function GET() {
  const [spaces, tasks, dash] = await Promise.all([listSpaces(), listTasks(), getSetting<string[]>("dashboard_spaces")]);
  return NextResponse.json({ spaces, tasks, dashboardSpaces: dash, today: todayStr() }, { headers: { "Cache-Control": "no-store" } });
}
