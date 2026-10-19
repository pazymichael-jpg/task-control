"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Archive, Check, LogOut, Plus } from "lucide-react";
import { useStore } from "./store";
import { Dot } from "./ui";
import AssistantBar from "./AssistantBar";
import { isClosed } from "@/lib/constants";

export default function Header() {
  const s = useStore(); const path = usePathname(); const router = useRouter();
  const archived = s.tasks.filter((t) => isClosed(t.status)).length;
  const tab = (active: boolean) => `flex items-center gap-1.5 rounded-lg px-2.5 h-8 text-sm whitespace-nowrap transition ${active ? "bg-soft text-ink font-bold" : "text-gray-600 font-medium hover:bg-gray-100"}`;
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-line pt-[env(safe-area-inset-top)]">
      <div className="max-w-5xl mx-auto flex items-center gap-2 px-3 sm:px-6 h-12">
        <Link href="/" aria-label="כל המרחבים" className="grid place-items-center size-7 rounded-lg bg-brand text-white shrink-0"><Check className="size-4" strokeWidth={3.2} /></Link>
        <nav className="flex-1 min-w-0 flex items-center gap-0.5 overflow-x-auto no-scrollbar" aria-label="מרחבים">
          <Link href="/" className={tab(path === "/")}>הכל</Link>
          {s.spaces.map((sp) => <Link key={sp.id} href={`/space/${sp.id}`} className={tab(path === `/space/${sp.id}`)}><Dot color={sp.color} />{sp.name}</Link>)}
          <Link href="/archive" className={tab(path === "/archive")}><Archive className="size-3.5" />ארכיון{archived > 0 && <span className="text-xs text-muted font-normal">{archived}</span>}</Link>
        </nav>
        <button onClick={() => s.setSpaceEditor({ mode: "new" })} aria-label="מרחב חדש" title="מרחב חדש" className="grid place-items-center size-8 rounded-lg border border-line text-ink hover:bg-gray-100 shrink-0"><Plus className="size-4" /></button>
        <button onClick={async () => { await fetch("/api/logout", { method: "POST" }); router.replace("/login"); }} aria-label="יציאה" title="יציאה" className="grid place-items-center size-8 rounded-lg text-muted hover:text-ink hover:bg-gray-100 shrink-0"><LogOut className="size-4 -scale-x-100" /></button>
      </div>
      <AssistantBar />
    </header>
  );
}
