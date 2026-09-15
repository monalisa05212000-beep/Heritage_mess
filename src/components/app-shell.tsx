import { AdminNav } from "@/components/admin-nav";
import { Brand } from "@/components/brand";
import { LogoutButton } from "@/components/auth/logout-button";

export function AppShell({ businessName, adminName, children }: { businessName: string; adminName: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-[color:var(--surface)]/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
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
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[11.5rem_minmax(0,1fr)] lg:py-9">
        <AdminNav />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
