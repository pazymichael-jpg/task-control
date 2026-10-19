"use client";
import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Check, Loader2, SendHorizontal, Sparkles, X } from "lucide-react";
import { useStore } from "./store";

type Msg = { role: "user" | "assistant"; content: string };
type Pending = { id: string; text: string; count: number; items: string[] };
type Reply = { text: string; error?: boolean; pending?: Pending };

// Follow-ups ("which space?") keep context for a few minutes, then each line starts fresh.
const HISTORY_TTL = 5 * 60_000;

export default function AssistantBar() {
  const s = useStore(); const path = usePathname();
  const space = path.match(/^\/space\/([^/]+)/)?.[1] ?? null;
  const spaceName = space ? s.spaces.find((x) => x.id === space)?.name : null;
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<Reply | null>(null);
  const hist = useRef<{ msgs: Msg[]; at: number }>({ msgs: [], at: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  function handle(r: any) {
    setReply({ text: r.reply, error: !!r.error, pending: r.pending });
    hist.current.msgs.push({ role: "assistant", content: r.reply });
    if (r.mutated) s.refresh();
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    if (Date.now() - hist.current.at > HISTORY_TTL) hist.current.msgs = [];
    hist.current.msgs.push({ role: "user", content: text });
    hist.current.at = Date.now();
    setInput(""); setBusy(true); setReply(null);
    try {
      const r = await fetch("/api/agent/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: hist.current.msgs.slice(-10), space }) });
      handle(await r.json());
    } catch { setReply({ text: "אין חיבור כרגע. נסה שוב.", error: true }); }
    setBusy(false);
  }
  async function confirm(approve: boolean) {
    if (!reply?.pending) return;
    const id = reply.pending.id;
    setBusy(true); setReply(null);
    try {
      const r = await fetch("/api/agent/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, approve }) });
      handle(await r.json());
    } catch { setReply({ text: "אין חיבור כרגע. נסה שוב.", error: true }); }
    setBusy(false);
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 pb-2.5">
      <form onSubmit={send} className="flex items-center gap-2 rounded-xl border border-line bg-[#f8f9fb] focus-within:bg-white focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15 ps-3 pe-1 h-11 transition">
        <Sparkles className="size-4 text-brand shrink-0" />
        <input ref={inputRef} dir="auto" value={input} onChange={(e) => setInput(e.target.value)} enterKeyHint="send" aria-label="הוספת משימה בטקסט חופשי"
          placeholder={spaceName ? `משימה ל${spaceName}, או "מרחב: משימה"…` : "פרטי: לשלם חשבון חשמל עד יום שלישי"}
          className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-gray-400" />
        <button disabled={busy || !input.trim()} aria-label="שליחה" className="grid place-items-center size-9 rounded-lg bg-brand text-white disabled:bg-transparent disabled:text-gray-400 transition shrink-0">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4 -scale-x-100" />}
        </button>
      </form>
      {reply && (
        <div role="status" className={`mt-1.5 flex items-start gap-2 rounded-lg px-3 py-2 text-sm anim-fade ${reply.error ? "bg-red-50 text-red-800" : reply.pending ? "bg-amber-50 text-amber-900" : "bg-brand-soft text-ink"}`}>
          <div className="flex-1 min-w-0" dir="auto">
            <p className="whitespace-pre-wrap">{reply.text}</p>
            {reply.pending && (
              <>
                <ul className="mt-1 text-[13px] max-h-24 overflow-y-auto">{reply.pending.items.slice(0, 10).map((it, i) => <li key={i} className="truncate">• {it}</li>)}</ul>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => confirm(true)} className="inline-flex items-center gap-1 rounded-md bg-brand text-white px-3 py-1 text-[13px] font-semibold"><Check className="size-3.5" />אישור</button>
                  <button onClick={() => confirm(false)} className="rounded-md border border-amber-300 bg-white px-3 py-1 text-[13px] font-semibold">ביטול</button>
                </div>
              </>
            )}
          </div>
          {!reply.pending && <button onClick={() => { setReply(null); inputRef.current?.focus(); }} aria-label="סגירה" className="text-muted hover:text-ink shrink-0 mt-0.5"><X className="size-4" /></button>}
        </div>
      )}
    </div>
  );
}
