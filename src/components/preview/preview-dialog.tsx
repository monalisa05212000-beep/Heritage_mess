"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

/** Accessible, prototype-only dialog with focus containment and focus return. */
export function PreviewDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const panelRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement;
    const timer = window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>("button, input, select, textarea, [tabindex]:not([tabindex='-1'])")?.focus(), 0);
    return () => { window.clearTimeout(timer); previousFocus.current?.focus(); };
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab") return;
    const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])") ?? []);
    if (!focusable.length) return;
    const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  return <div className="fixed inset-0 z-30 grid place-items-end bg-black/35 p-0 sm:place-items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="preview-dialog-title" onKeyDown={onKeyDown} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-[var(--surface)] p-5 shadow-2xl sm:rounded-2xl">
      <div className="flex items-start justify-between gap-4"><h3 id="preview-dialog-title" className="text-xl font-black tracking-[-.025em]">{title}</h3><button type="button" aria-label="Close dialog" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-lg text-xl font-bold text-[var(--muted)] hover:bg-black/5">×</button></div>
      {children}
    </section>
  </div>;
}
