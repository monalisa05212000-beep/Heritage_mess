import Link from "next/link";

import { Brand } from "@/components/brand";
import { CustomerLogoutButton } from "@/components/auth/customer-logout-button";

export function CustomerShell({ businessName, children }: { businessName: string; children: React.ReactNode }) {
  return <main className="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-6"><header className="flex flex-wrap items-center justify-between gap-3"><Brand compact /><CustomerLogoutButton /></header><p className="mt-2 text-xs font-semibold text-[var(--muted)]">{businessName}</p><nav className="mt-5 flex flex-wrap gap-2" aria-label="Customer navigation"><Link className="inline-flex shrink-0 items-center rounded-xl border border-[var(--line)] bg-white px-3 py-3 text-sm font-bold" href="/customer">Menu</Link><Link className="inline-flex shrink-0 items-center rounded-xl border border-[var(--line)] bg-white px-3 py-3 text-sm font-bold" href="/customer/orders">Orders</Link><Link className="inline-flex shrink-0 items-center rounded-xl border border-[var(--line)] bg-white px-3 py-3 text-sm font-bold" href="/customer/account">Account</Link></nav><div className="mt-6">{children}</div></main>;
}
