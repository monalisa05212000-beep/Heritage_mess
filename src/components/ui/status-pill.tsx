type StatusTone = "ready" | "pending" | "neutral" | "danger";

const tones: Record<StatusTone, string> = {
  ready: "bg-[var(--leaf-pale)] text-[var(--leaf)]",
  pending: "bg-[var(--amber-pale)] text-[#945d09]",
  neutral: "bg-stone-100 text-stone-600",
  danger: "bg-[var(--danger-pale)] text-[var(--danger)]",
};

export function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: StatusTone }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tones[tone]}`}>{children}</span>;
}

