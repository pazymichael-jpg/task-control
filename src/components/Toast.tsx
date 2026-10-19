"use client";
import { useStore } from "./store";

export default function Toast() {
  const { toast, showToast } = useStore();
  if (!toast) return null;
  return (
    <div role="status" key={toast.id} className="fixed z-40 bottom-[calc(1rem+env(safe-area-inset-bottom))] inset-x-3 sm:inset-x-auto sm:start-1/2 sm:-translate-x-1/2 sm:rtl:translate-x-1/2 flex items-center gap-3 rounded-xl bg-ink text-white ps-4 pe-2 py-2 text-sm shadow-pop anim-pop">
      <span className="flex-1 min-w-0 truncate" dir="auto">{toast.text}</span>
      {toast.undo && <button onClick={() => { toast.undo!(); showToast("בוטל"); }} className="rounded-lg px-3 py-1.5 font-semibold text-amber-300 hover:bg-white/10">ביטול</button>}
    </div>
  );
}
