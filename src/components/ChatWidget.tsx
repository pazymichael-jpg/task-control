"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, Check, ChevronDown, Layers, Loader2, SendHorizontal, Sparkles, X } from "lucide-react";
import { useStore } from "./store";
import { Dot } from "./ui";

type Pending = { id: string; text: string; count: number; items: string[]; state?: "pending" | "approved" | "declined" };
type Msg = { id: string; role: "user" | "assistant" | "divider"; content: string; actions?: string[]; pending?: Pending; error?: boolean };
const uid = () => Math.random().toString(36).slice(2);

export default function ChatWidget() {
  const s = useStore(); const path = usePathname();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [override, setOverride] = useState<{ path: string; scope: string } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const routeScope = useMemo(() => { const m = path.match(/^\/space\/([^/]+)/); return m ? m[1] : "all"; }, [path]);
  const scope = override && override.path === path ? override.scope : routeScope;
  const scopeSpace = scope === "all" ? null : s.spaces.find((x) => x.id === scope) ?? null;
  const effectiveScope = scope !== "all" && !scopeSpace ? "all" : scope;

  // restore conversation
  useEffect(() => { try { const r = sessionStorage.getItem("chat"); if (r) setMsgs(JSON.parse(r)); } catch {} }, []);
  useEffect(() => { try { sessionStorage.setItem("chat", JSON.stringify(msgs.slice(-60))); } catch {} }, [msgs]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, busy, open]);
  useEffect(() => { if (open) setTimeout(() => taRef.current?.focus(), 150); }, [open]);

  // note scope changes in the conversation
  const lastScope = useRef<string | null>(null);
  useEffect(() => {
    if (!s.loaded) return;
    if (lastScope.current !== null && lastScope.current !== effectiveScope && msgs.length) {
      setMsgs((m) => [...m, { id: uid(), role: "divider", content: `עכשיו עובד על: ${effectiveScope === "all" ? "כל המרחבים" : scopeSpace?.name}` }]);
    }
    lastScope.current = effectiveScope;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveScope, s.loaded]);

  function applyResult(r: any, extra?: Partial<Msg>) {
    setMsgs((m) => [...m, { id: uid(), role: "assistant", content: r.reply, actions: r.actions, pending: r.pending ? { ...r.pending, state: "pending" } : undefined, error: !!r.error, ...extra }]);
    if (r.mutated) s.refresh();
  }
  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    setInput(""); setBusy(true);
    const next: Msg[] = [...msgs, { id: uid(), role: "user", content: t }];
    setMsgs(next);
    try {
      const history = next.filter((m) => m.role !== "divider").slice(-16).map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/agent/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history, scope: effectiveScope }) });
      applyResult(await res.json());
    } catch { applyResult({ reply: "אין חיבור כרגע. נסה שוב.", error: true }); }
    setBusy(false);
  }
  async function confirm(msg: Msg, approve: boolean) {
    if (!msg.pending || busy) return;
    setMsgs((m) => m.map((x) => x.id === msg.id ? { ...x, pending: { ...x.pending!, state: approve ? "approved" : "declined" } } : x));
    setBusy(true);
    try {
      const res = await fetch("/api/agent/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: msg.pending.id, approve }) });
      applyResult(await res.json());
    } catch { applyResult({ reply: "אין חיבור כרגע. נסה שוב.", error: true }); }
    setBusy(false);
  }

  const suggestions = scopeSpace
    ? ["מה הכי חשוב לעשות כאן?", "מה באיחור?", "תוסיף משימה: ", "תדחה את כל מה שבאיחור למחר"]
    : ["מה המשימות הכי חשובות שצריך לתת להן עדיפות?", "תסכם לי את המצב", "תוסיף לבית: לקנות חלב, להתקשר לסבתא מחר", "תדחה את כל מה שבאיחור למחר"];

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="פתיחת צ'אט עם הסוכן"
          className="fixed bottom-5 inset-s-5 z-40 flex items-center gap-2.5 rounded-full bg-brand text-white ps-4 pe-5 h-14 shadow-pop hover:bg-brand-dark hover:scale-[1.03] transition group">
          <span className="relative grid place-items-center"><Sparkles className="size-6" /><i className="absolute -top-0.5 -end-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-brand" /></span>
          <span className="font-bold">שאל את הסוכן</span>
        </button>
      )}
      {open && (
        <section role="dialog" aria-label="סוכן המשימות" className="fixed z-50 bottom-0 inset-s-0 sm:bottom-5 sm:inset-s-5 w-full sm:w-[420px] h-dvh sm:h-[min(700px,calc(100dvh-40px))] bg-white sm:rounded-3xl shadow-pop border border-line flex flex-col overflow-hidden anim-pop">
          <header className="bg-gradient-to-l from-brand to-[#6d5df0] text-white px-4 pt-3.5 pb-3 shrink-0">
            <div className="flex items-center gap-3">
              <span className="grid place-items-center size-10 rounded-full bg-white/20"><Bot className="size-5" /></span>
              <div className="flex-1 min-w-0"><div className="font-bold leading-tight">סוכן המשימות</div><div className="text-xs text-white/80 flex items-center gap-1.5"><i className="size-1.5 rounded-full bg-emerald-300" />מחובר ומוכן לעזור</div></div>
              <button onClick={() => setOpen(false)} aria-label="סגירה" className="grid place-items-center size-8 rounded-lg hover:bg-white/15"><X className="size-5" /></button>
            </div>
            <div className="relative mt-3">
              <button onClick={() => setMenu((v) => !v)} aria-haspopup="listbox" aria-expanded={menu} className="w-full flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-3 py-2 text-sm transition">
                <span className="text-white/75">עובד על:</span>
                {scopeSpace ? <><Dot color={scopeSpace.color} /><b>{scopeSpace.name}</b></> : <><Layers className="size-4" /><b>כל המרחבים</b></>}
                <ChevronDown className="size-4 ms-auto" />
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                  <ul role="listbox" className="absolute z-20 inset-x-0 top-full mt-1.5 card shadow-pop p-1.5 text-ink anim-pop max-h-60 overflow-y-auto">
                    {[{ id: "all", name: "כל המרחבים", color: "" }, ...s.spaces].map((o) => (
                      <li key={o.id}>
                        <button role="option" aria-selected={o.id === effectiveScope} onClick={() => { setOverride({ path, scope: o.id }); setMenu(false); }} className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-soft">
                          {o.color ? <Dot color={o.color} /> : <Layers className="size-4 text-muted" />}{o.name}{o.id === effectiveScope && <Check className="size-4 ms-auto text-brand" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto scroll-thin px-4 py-4 space-y-3 bg-[#f7f8fc]" aria-live="polite">
            {!msgs.length && (
              <div className="text-center pt-4 pb-2 anim-fade">
                <div className="mx-auto grid place-items-center size-14 rounded-2xl bg-brand-soft text-brand mb-3"><Sparkles className="size-7" /></div>
                <p className="font-bold text-lg">היי! במה אפשר לעזור?</p>
                <p className="text-sm text-muted mt-1">אפשר לשאול שאלות, להוסיף, לעדכן ולמחוק משימות בשפה חופשית.</p>
                <div className="mt-5 flex flex-col gap-2">
                  {suggestions.map((q) => <button key={q} onClick={() => q.endsWith(": ") ? (setInput(q), taRef.current?.focus()) : send(q)} className="text-start text-sm font-medium rounded-xl bg-white border border-line px-3.5 py-2.5 hover:border-brand hover:bg-brand-soft/50 transition">{q}</button>)}
                </div>
              </div>
            )}
            {msgs.map((m) => {
              if (m.role === "divider") return <div key={m.id} className="flex items-center gap-3 text-xs text-muted font-semibold"><i className="flex-1 h-px bg-line" />{m.content}<i className="flex-1 h-px bg-line" /></div>;
              const mine = m.role === "user";
              return (
                <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"} anim-pop`}>
                  <div className={`max-w-[88%] ${mine ? "" : "w-full"}`}>
                    <div className={`rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap shadow-sm ${mine ? "bg-brand text-white rounded-ss-md" : m.error ? "bg-red-50 text-red-800 border border-red-200 rounded-se-md" : "bg-white border border-line rounded-se-md"}`} dir="auto">{m.content}</div>
                    {m.actions && m.actions.length > 0 && (
                      <div className="mt-1.5 flex flex-col gap-1">{m.actions.map((a, i) => <span key={i} className="inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold"><Check className="size-3.5" strokeWidth={3} />{a}</span>)}</div>
                    )}
                    {m.pending && (
                      <div className="mt-2 rounded-2xl border border-amber-300 bg-amber-50 p-3">
                        <div className="text-xs font-bold text-amber-800 mb-1.5">נדרש אישור · {m.pending.count} משימות</div>
                        <ul className="text-sm space-y-0.5 max-h-28 overflow-y-auto scroll-thin mb-3">
                          {m.pending.items.slice(0, 12).map((it, i) => <li key={i} className="truncate" dir="auto">• {it}</li>)}
                          {m.pending.items.length > 12 && <li className="text-muted">…ועוד {m.pending.items.length - 12}</li>}
                        </ul>
                        {m.pending.state === "pending" ? (
                          <div className="flex gap-2">
                            <button disabled={busy} onClick={() => confirm(m, true)} className="btn btn-primary flex-1 !py-2"><Check className="size-4" strokeWidth={3} />מאשר</button>
                            <button disabled={busy} onClick={() => confirm(m, false)} className="btn btn-ghost flex-1 !py-2">לא מאשר</button>
                          </div>
                        ) : <div className="text-sm font-semibold text-amber-900">{m.pending.state === "approved" ? "✓ אושר" : "✕ לא אושר"}</div>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {busy && (
              <div className="flex justify-end"><div className="bg-white border border-line rounded-2xl rounded-se-md px-4 py-3 flex gap-1.5" aria-label="הסוכן חושב">
                {[0, 1, 2].map((i) => <i key={i} className="size-2 rounded-full bg-brand" style={{ animation: `dots 1.2s ${i * 0.15}s infinite` }} />)}
              </div></div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="shrink-0 border-t border-line bg-white p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-line bg-white focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15 transition ps-3.5 pe-1.5 py-1.5">
              <textarea ref={taRef} dir="auto" rows={1} value={input} onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input); } }}
                placeholder={scopeSpace ? `כתבו הודעה על "${scopeSpace.name}"…` : "כתבו הודעה לסוכן…"} className="flex-1 resize-none bg-transparent outline-none py-2 max-h-30" aria-label="הודעה לסוכן" />
              <button disabled={busy || !input.trim()} aria-label="שליחה" className="grid place-items-center size-10 rounded-xl bg-brand text-white disabled:bg-soft disabled:text-muted transition shrink-0">
                {busy ? <Loader2 className="size-5 animate-spin" /> : <SendHorizontal className="size-5 -scale-x-100" />}
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
