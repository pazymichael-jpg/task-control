import { NextResponse } from "next/server";
import { createSpace } from "@/lib/tasks";
export async function POST(req: Request) {
  const b = await req.json();
  if (!b.name?.trim()) return NextResponse.json({ error: "חסר שם" }, { status: 400 });
  return NextResponse.json(await createSpace(b.name, b.color || "#4F46E5", b.view));
}
