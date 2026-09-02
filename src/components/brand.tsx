import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 text-[var(--ink)] no-underline">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--ink)] text-base font-black text-[var(--paper)]">H</span>
      {!compact ? (
        <span className="leading-tight">
          <span className="block text-sm font-extrabold tracking-tight">Heritage</span>
          <span className="utility-type block text-[10px] font-semibold uppercase text-[var(--muted)]">Daily service</span>
        </span>
      ) : null}
    </Link>
  );
}
