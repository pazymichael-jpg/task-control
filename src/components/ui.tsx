"use client";
import { useEffect } from "react";
import { PRIORITY_META, STATUS_META, type Priority, type Status } from "@/lib/constants";
import { X } from "lucide-react";

export function PriorityBadge({ p, className = "" }: { p: Priority; className?: string }) {
  const m = PRIORITY_META[p];
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${className}`} style={{ background: m.bg, color: m.color }}><i className="size-1.5 rounded-full" style={{ background: m.color }} />{m.label}</span>;
}
export function StatusBadge({ s, className = "" }: { s: Status; className?: string }) {
  const m = STATUS_META[s];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${className}`} style={{ background: m.bg, color: m.color }}>{m.label}</span>;
}
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-3 sm:p-6 bg-ink/40 backdrop-blur-[2px] anim-fade" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`card w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[92dvh] overflow-y-auto scroll-thin shadow-pop anim-pop`}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="סגירה" className="grid place-items-center size-8 rounded-lg text-muted hover:bg-soft"><X className="size-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; color?: string; bg?: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className="rounded-full border px-3 py-1 text-sm font-semibold transition"
            style={on ? { background: o.bg ?? "#eceafd", color: o.color ?? "#4f46e5", borderColor: o.color ?? "#4f46e5" } : { background: "#fff", color: "#667091", borderColor: "#e3e7f1" }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
export function Dot({ color, size = 10 }: { color: string; size?: number }) {
  return <i className="inline-block rounded-full shrink-0" style={{ background: color, width: size, height: size }} />;
}
