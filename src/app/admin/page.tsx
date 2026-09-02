import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { BusinessClock } from "@/components/business-clock";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { getAdminPrincipal } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/login");

  const admin = await prisma.user.findUnique({
    where: { id: principal.userId },
    select: { name: true, business: { select: { name: true } } },
  });
  if (!admin) redirect("/login");

  return (
    <AppShell businessName={admin.business.name} adminName={admin.name}>
      <section className="service-strip paper-panel rounded-2xl p-5 sm:p-7">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="utility-type text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--saffron-deep)]">Today’s service · <BusinessClock /></p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-[var(--ink)] sm:text-4xl">Start with a clean counter.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">The foundation is ready. Configure the business details, then add customers and menus in the next delivery phase.</p>
          </div>
          <StatusPill tone="ready">Workspace ready</StatusPill>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3" aria-label="Today’s service summary">
        {[
          ["Orders", "—", "No order data yet"],
          ["Kitchen", "—", "Menu setup comes next"],
          ["Balance", "—", "Billing begins in Phase 5"],
        ].map(([label, value, hint]) => (
          <article key={label} className="paper-panel rounded-2xl p-4">
            <p className="utility-type text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{label}</p>
            <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
            <p className="mt-1 text-xs font-medium text-[var(--muted)]">{hint}</p>
          </article>
        ))}
      </section>

      <div className="mt-6">
        <EmptyState
          title="The service board is waiting for its first menu"
          description="Business access is secure and the workspace is ready. Save contact details now; meal types, prices, cutoffs, and menus are the next phase."
          action={<Link href="/admin/settings" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--saffron)] px-4 text-sm font-bold text-white no-underline hover:bg-[var(--saffron-deep)]">Review business settings</Link>}
        />
      </div>
    </AppShell>
  );
}
