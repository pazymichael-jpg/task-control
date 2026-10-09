"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, LayoutDashboard, LogOut, Plus } from "lucide-react";
import { useStore } from "./store";
import { Dot } from "./ui";

export default function Header() {
  const s = useStore(); const path = usePathname(); const router = useRouter();
  const pill = (active: boolean) => `flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition border ${active ? "bg-ink text-white border-ink" : "bg-white text-ink border-line hover:bg-soft"}`;
  return (
    <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur border-b border-line">
      <div className="max-w-7xl mx-auto flex items-center gap-3 px-4 sm:px-6 h-16">
        <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="לדשבורד">
          <span className="grid place-items-center size-9 rounded-xl bg-brand text-white shadow-md shadow-brand/30"><Check className="size-5" strokeWidth={3.2} /></span>
          <span className="font-extrabold text-lg hidden sm:block">שליטה במשימות</span>
        </Link>
        <nav className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto no-scrollbar py-1" aria-label="מרחבים">
          <Link href="/" className={pill(path === "/")}><LayoutDashboard className="size-4" />דשבורד</Link>
          <span className="w-px h-5 bg-line shrink-0" />
          {s.spaces.map((sp) => {
            const active = path === `/space/${sp.id}`;
            return <Link key={sp.id} href={`/space/${sp.id}`} className={pill(active)}><Dot color={sp.color} />{sp.name}</Link>;
          })}
          <button onClick={() => s.setSpaceEditor({ mode: "new" })} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-muted border border-dashed border-line hover:bg-white hover:text-ink whitespace-nowrap"><Plus className="size-4" />מרחב</button>
        </nav>
        <button onClick={async () => { await fetch("/api/logout", { method: "POST" }); router.replace("/login"); }} aria-label="יציאה" title="יציאה" className="grid place-items-center size-9 rounded-lg text-muted hover:bg-white shrink-0"><LogOut className="size-[18px]" /></button>
      </div>
    </header>
  );
}
