import { NextResponse } from "next/server";
import { resolvePending } from "@/lib/agent";

export const maxDuration = 60;
export async function POST(req: Request) {
  try {
    const { id, approve } = await req.json();
    return NextResponse.json(await resolvePending(String(id), !!approve));
  } catch (e: any) {
    console.error("confirm error", e);
    return NextResponse.json({ reply: "משהו השתבש. נסה שוב.", mutated: false, actions: [], error: String(e?.message ?? e) });
  }
}
