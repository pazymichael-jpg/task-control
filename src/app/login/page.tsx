"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    if (r.ok) { router.replace("/"); router.refresh(); }
    else { setErr((await r.json().catch(() => ({}))).error || "שגיאה"); setBusy(false); }
  }
  return (
    <main className="min-h-dvh grid place-items-center p-4 bg-[radial-gradient(1200px_500px_at_50%_-10%,#e3e1fb,transparent)]">
      <form onSubmit={submit} className="card w-full max-w-sm p-8 anim-pop">
        <div className="grid place-items-center size-12 rounded-2xl bg-brand text-white shadow-lg shadow-brand/30 mb-5"><Check className="size-6" strokeWidth={3} /></div>
        <h1 className="text-2xl font-extrabold">שליטה במשימות</h1>
        <p className="text-muted text-sm mt-1 mb-6">הכניסה למערכת האישית שלך</p>
        <label className="label" htmlFor="pw">סיסמה</label>
        <input id="pw" type="password" dir="auto" autoFocus autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="field" />
        {err && <p className="text-sm text-red-600 mt-2" role="alert">{err}</p>}
        <button className="btn btn-primary w-full mt-5" disabled={busy || !password}>{busy ? <Loader2 className="size-4 animate-spin" /> : "כניסה"}</button>
      </form>
    </main>
  );
}
