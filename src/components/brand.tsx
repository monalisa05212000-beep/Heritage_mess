import Link from "next/link";
import Image from "next/image";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center text-[var(--ink)] no-underline" aria-label="Heritage Home Food">
      <Image
        src="/heritage-logo.png"
        alt="Heritage Home Food"
        width={compact ? 48 : 168}
        height={compact ? 48 : 58}
        className={compact ? "h-10 w-10 object-contain" : "h-12 w-40 object-contain object-left"}
        priority
      />
    </Link>
  );
}
