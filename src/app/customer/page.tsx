import { redirect } from "next/navigation";

import { Brand } from "@/components/brand";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { getCustomerPrincipal } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CustomerHomePage() {
  const principal = await getCustomerPrincipal();
  if (!principal) redirect("/customer/access");

  const customer = await prisma.customer.findUnique({ where: { id: principal.customerId }, select: { name: true, business: { select: { name: true } } } });
  if (!customer) redirect("/customer/access");

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <Brand compact />
        <StatusPill tone="ready">Account active</StatusPill>
      </header>
      <section className="service-strip paper-panel mt-7 rounded-2xl p-5">
        <p className="utility-type text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--saffron-deep)]">{customer.business.name}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Hello, {customer.name}.</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Your account is ready. Menus and meal ordering will appear here once your caterer publishes service.</p>
      </section>
      <div className="mt-6">
        <EmptyState title="Menu not published yet" description="There is no menu available to order right now. Please check back after your caterer publishes today’s service." />
      </div>
    </main>
  );
}
