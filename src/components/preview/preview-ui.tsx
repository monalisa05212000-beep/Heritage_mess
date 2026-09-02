"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

export function PreviewPill({ children, tone = "neutral" }: { children: ReactNode; tone?: "ready" | "pending" | "danger" | "neutral" }) {
  const colors = {
    ready: "bg-[var(--leaf-pale)] text-[var(--leaf)] border border-emerald-200",
    pending: "bg-[var(--amber-pale)] text-[#b45309] border border-amber-200",
    danger: "bg-[var(--danger-pale)] text-[var(--danger)] border border-red-200",
    neutral: "bg-gray-100 text-gray-700 border border-gray-200"
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${colors[tone]}`}>{children}</span>;
}

export function PreviewCard({ children, className = "", accent, onClick }: { children: ReactNode; className?: string; accent?: "saffron" | "leaf" | "amber" | "danger"; onClick?: () => void }) {
  const accentStyles = accent ? {
    saffron: "border-l-4 border-l-[var(--saffron)]",
    leaf: "border-l-4 border-l-[var(--leaf)]",
    amber: "border-l-4 border-l-[var(--amber)]",
    danger: "border-l-4 border-l-[var(--danger)]"
  }[accent] : "";

  return <section onClick={onClick} className={`paper-panel rounded-2xl p-4 sm:p-5 transition-shadow ${accentStyles} ${className}`}>{children}</section>;
}

export function PreviewButton({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  className = "",
  type = "button"
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "quiet" | "danger" | "outline";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}) {
  const styles = {
    primary: "bg-[var(--saffron)] text-white hover:bg-[var(--saffron-deep)] shadow-sm active:scale-[0.98]",
    secondary: "border border-[var(--line)] bg-white text-[var(--ink)] hover:bg-stone-50 hover:border-gray-300 shadow-sm active:scale-[0.98]",
    outline: "border-2 border-[var(--saffron)] text-[var(--saffron-deep)] bg-white hover:bg-orange-50 active:scale-[0.98]",
    quiet: "text-[var(--ink)] hover:bg-stone-100 active:scale-[0.98]",
    danger: "bg-[var(--danger)] text-white hover:bg-red-700 shadow-sm active:scale-[0.98]"
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function SectionTitle({ eyebrow, title, detail, action }: { eyebrow?: string; title: string; detail?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? <p className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--saffron-deep)]">{eyebrow}</p> : null}
        <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] text-[var(--ink)] sm:text-3xl">{title}</h2>
        {detail ? <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">{detail}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PreviewNotice({ children, tone = "amber" }: { children: ReactNode; tone?: "amber" | "green" | "red" }) {
  const colors = {
    amber: "border-amber-200 bg-amber-50/70 text-amber-950",
    green: "border-emerald-200 bg-emerald-50/70 text-emerald-950",
    red: "border-red-200 bg-red-50/70 text-red-950"
  };
  return <div role="status" className={`rounded-xl border p-4 text-sm leading-6 ${colors[tone]}`}>{children}</div>;
}

export function PreviewState({ kind, title, detail, action }: { kind: "loading" | "empty" | "error" | "success"; title: string; detail: string; action?: ReactNode }) {
  const tone = { loading: "amber", empty: "amber", error: "red", success: "green" }[kind] as "amber" | "red" | "green";
  return (
    <PreviewNotice tone={tone}>
      <p className="font-extrabold text-base">{title}</p>
      <p className="mt-1 text-sm leading-6">{detail}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </PreviewNotice>
  );
}

export function PreviewBottomSheet({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>("button, input, select, textarea")?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") { event.preventDefault(); onClose(); }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-black/40 backdrop-blur-xs sm:place-items-center sm:p-6" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="sheet-title" onKeyDown={onKeyDown} className="slide-up max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-stone-300 sm:hidden" />
        <div className="flex items-start justify-between gap-4 pb-2 border-b border-stone-100">
          <h3 id="sheet-title" className="text-xl font-black tracking-tight">{title}</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-full text-lg font-bold text-stone-500 hover:bg-stone-100">×</button>
        </div>
        <div className="mt-4">{children}</div>
      </section>
    </div>
  );
}

export function PreviewProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  return (
    <div>
      {label ? (
        <div className="flex justify-between text-xs font-extrabold text-[var(--muted)] mb-1.5">
          <span>{label}</span>
          <span>{value} / {max}</span>
        </div>
      ) : null}
      <div className="h-3 w-full overflow-hidden rounded-full bg-stone-100 p-0.5 border border-stone-200">
        <div className="h-full rounded-full bg-[var(--saffron)] transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function PreviewSkeleton({ className = "h-12 w-full" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-stone-200/80 ${className}`} />;
}

export function PreviewToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div aria-live="polite" role="status" className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl bg-[var(--ink)] px-5 py-3.5 text-sm font-bold text-white shadow-2xl sm:bottom-6">
      <div className="flex items-center justify-between gap-3">
        <span>{message}</span>
        <button type="button" onClick={onDismiss} className="grid size-7 place-items-center rounded-full bg-white/20 text-sm font-extrabold hover:bg-white/30" aria-label="Dismiss">✕</button>
      </div>
    </div>
  );
}

export function DemoBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-xs font-bold text-amber-900">
      Preview Mode — Mock Interactive Prototype. No live charges, back-end DB, or WhatsApp calls.
    </div>
  );
}
