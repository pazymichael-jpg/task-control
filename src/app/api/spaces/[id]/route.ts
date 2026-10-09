import { NextResponse } from "next/server";
import { deleteSpace, updateSpace } from "@/lib/tasks";
type Ctx = { params: Promise<{ id: string }> };
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  await updateSpace(id, await req.json());
  return NextResponse.json({ ok: true });
}
export async function DELETE(_: Request, { params }: Ctx) {
  const { id } = await params;
  await deleteSpace(id);
  return NextResponse.json({ ok: true });
}
