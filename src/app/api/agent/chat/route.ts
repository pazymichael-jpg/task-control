import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";

export const maxDuration = 60;
export async function POST(req: Request) {
  try {
    const { messages, scope } = await req.json();
    if (!Array.isArray(messages) || !messages.length) return NextResponse.json({ error: "no messages" }, { status: 400 });
    const history = messages.filter((m: any) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string").map((m: any) => ({ role: m.role, content: m.content }));
    return NextResponse.json(await runAgent({ history, scope: typeof scope === "string" ? scope : "all" }));
  } catch (e: any) {
    console.error("agent error", e);
    return NextResponse.json({ reply: "משהו השתבש בחיבור לסוכן. נסה שוב בעוד רגע.", mutated: false, actions: [], error: String(e?.message ?? e) }, { status: 200 });
  }
}
