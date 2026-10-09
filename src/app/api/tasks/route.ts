import { NextResponse } from "next/server";
import { cleanTaskInput, createTask } from "@/lib/tasks";
export async function POST(req: Request) {
  try {
    const task = await createTask(cleanTaskInput(await req.json()));
    return NextResponse.json(task);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
