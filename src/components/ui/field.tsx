import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type BaseProps = { label: string; hint?: string; error?: string };

export function InputField({ label, hint, error, className = "", ...props }: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-[var(--ink)]">
      <span>{label}</span>
      <input
        className={`min-h-12 rounded-xl border bg-white px-3.5 text-[var(--ink)] outline-none transition placeholder:text-stone-400 ${error ? "border-[var(--danger)]" : "border-[var(--line)] focus:border-[var(--saffron)]"} ${className}`}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? <span className="text-xs font-medium text-[var(--danger)]">{error}</span> : hint ? <span className="text-xs font-medium text-[var(--muted)]">{hint}</span> : null}
    </label>
  );
}

export function TextareaField({ label, hint, error, className = "", ...props }: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-[var(--ink)]">
      <span>{label}</span>
      <textarea
        className={`min-h-24 resize-y rounded-xl border bg-white px-3.5 py-3 text-[var(--ink)] outline-none transition placeholder:text-stone-400 ${error ? "border-[var(--danger)]" : "border-[var(--line)] focus:border-[var(--saffron)]"} ${className}`}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? <span className="text-xs font-medium text-[var(--danger)]">{error}</span> : hint ? <span className="text-xs font-medium text-[var(--muted)]">{hint}</span> : null}
    </label>
  );
}

