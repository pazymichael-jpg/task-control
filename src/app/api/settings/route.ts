import { NextResponse } from "next/server";
import { setSetting } from "@/lib/tasks";
export async function PUT(req: Request) {
  const { dashboardSpaces } = await req.json();
  if (Array.isArray(dashboardSpaces)) await setSetting("dashboard_spaces", dashboardSpaces.filter((x) => typeof x === "string"));
  return NextResponse.json({ ok: true });
}
