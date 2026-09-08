import Link from "next/link";

import { Brand } from "@/components/brand";
import { LogoutButton } from "@/components/auth/logout-button";

const navigation = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/menus", label: "Menus" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/money", label: "Money" },
  { href: "/admin/settings", label: "Settings" },
];

export function AppShell({ businessName, adminName, children }: { businessName: string; adminName: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-[color:var(--surface)]/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Brand />
          <div className="flex items-center gap-1.5 sm:gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-xs font-bold text-[var(--ink)]">{adminName}</span>
              <span className="block text-[11px] text-[var(--muted)]">{businessName}</span>
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[11.5rem_minmax(0,1fr)] lg:py-9">
        <nav className="flex gap-2 overflow-x-auto lg:block lg:space-y-1" aria-label="Admin navigation">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className="shrink-0 rounded-lg px-3 py-2 text-sm font-bold text-[var(--muted)] transition hover:bg-white hover:text-[var(--ink)]">
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
