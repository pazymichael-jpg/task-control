"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { useStore } from "./store";
import { Dot } from "./ui";

export default function Header() {
  const s = useStore(); const path = usePathname(); const router = useRouter();
  const tab = (active: boolean) => `flex items-center gap-2 rounded-xl px-3.5 py-2 text-[15px] whitespace-nowrap transition ${active ? "bg-soft text-ink font-bold" : "text-gray-600 font-medium hover:bg-gray-100"}`;
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-line">
      <div className="max-w-7xl mx-auto flex items-center gap-6 px-4 sm:px-8 h-16">
        <Link href="/" className="flex items-center gap-2.5 shrink-0 font-extrabold text-[17px]" aria-label="לדשבורד">
          <span className="grid place-items-center size-[30px] rounded-[9px] bg-brand text-white"><Check className="size-4" strokeWidth={3.2} /></span>
          <span className="hidden sm:block">שליטה במשימות</span>
        </Link>
        <nav className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto no-scrollbar" aria-label="ניווט ראשי">
          <Link href="/" className={tab(path === "/")}>דשבורד</Link>
          {s.spaces.map((sp) => <Link key={sp.id} href={`/space/${sp.id}`} className={tab(path === `/space/${sp.id}`)}><Dot color={sp.color} />{sp.name}</Link>)}
          <button onClick={() => s.setSpaceEditor({ mode: "new" })} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[15px] font-medium text-muted hover:bg-gray-100 whitespace-nowrap"><Plus className="size-4" />מרחב חדש</button>
        </nav>
        <button onClick={async () => { await fetch("/api/logout", { method: "POST" }); router.replace("/login"); }} className="text-sm font-medium text-muted hover:text-ink px-3 min-h-10 rounded-xl hover:bg-gray-100 shrink-0">יציאה</button>
      </div>
    </header>
  );
}
