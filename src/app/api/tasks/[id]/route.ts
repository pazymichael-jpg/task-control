import { NextResponse } from "next/server";
import { cleanTaskInput, deleteTask, updateTask } from "@/lib/tasks";
type Ctx = { params: Promise<{ id: string }> };
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const t = await updateTask(id, cleanTaskInput(await req.json()));
  return t ? NextResponse.json(t) : NextResponse.json({ error: "not found" }, { status: 404 });
}
export async function DELETE(_: Request, { params }: Ctx) {
  const { id } = await params;
  await deleteTask(id);
  return NextResponse.json({ ok: true });
}
