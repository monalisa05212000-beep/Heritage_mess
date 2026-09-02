import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { BusinessSettingsForm } from "@/components/settings/business-settings-form";
import { StatusPill } from "@/components/ui/status-pill";
import { getAdminPrincipal } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/login");

  const admin = await prisma.user.findUnique({
    where: { id: principal.userId },
    select: { name: true, business: { select: { id: true, name: true, phone: true, address: true } } },
  });
  if (!admin) redirect("/login");

  return (
    <AppShell businessName={admin.business.name} adminName={admin.name}>
      <div className="max-w-2xl">
        <p className="utility-type text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--saffron-deep)]">Foundation settings</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-black tracking-[-0.035em]">Business details</h1>
          <StatusPill tone="ready">IST timezone</StatusPill>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">These details belong to your business and will appear on future customer and invoice views. The service timezone is fixed to Asia/Kolkata.</p>
        <section className="paper-panel mt-6 rounded-2xl p-5 sm:p-7">
          <BusinessSettingsForm business={admin.business} />
        </section>
        <section className="mt-5 rounded-2xl border border-[#bbf7d0] bg-[#ecfdf5] p-5">
          <p className="text-sm font-extrabold text-[var(--ink)]">Meal rules are configured with meal types</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Breakfast, lunch, and dinner prices plus their separate ordering and cancellation cutoffs are deliberately introduced with menu setup so no placeholder rules become live.</p>
        </section>
      </div>
    </AppShell>
  );
}
