"use client";
import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center sm:p-6 bg-ink/40 anim-fade" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92dvh] overflow-y-auto shadow-pop anim-pop">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-base font-bold">{title}</h2>
          <button onClick={onClose} aria-label="סגירה" className="grid place-items-center size-9 rounded-lg text-muted hover:bg-soft"><X className="size-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return <i className="inline-block rounded-full shrink-0" style={{ background: color, width: size, height: size }} />;
}
