import { redirect } from "next/navigation";

import { Brand } from "@/components/brand";
import { CustomerOrderBoard } from "@/components/customer/customer-order-board";
import { StatusPill } from "@/components/ui/status-pill";
import { getCustomerPrincipal } from "@/lib/auth/session";
import { businessDateFromKey, businessDateKey } from "@/lib/domain/time";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CustomerHomePage() {
  const principal = await getCustomerPrincipal();
  if (!principal) redirect("/customer/access");

  const customer = await prisma.customer.findUnique({ where: { id: principal.customerId }, select: { name: true, business: { select: { name: true } } } });
  if (!customer) redirect("/customer/access");

  const today = businessDateKey();
  const serviceDate = businessDateFromKey(today);
  const [menu, orders] = await Promise.all([
    prisma.menu.findFirst({
      where: { businessId: principal.businessId, menuDate: serviceDate, status: "PUBLISHED" },
      select: {
        items: {
          orderBy: { mealType: { sortOrder: "asc" } },
          select: { id: true, name: true, description: true, mealType: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.orderItem.findMany({
      where: { businessId: principal.businessId, customerId: principal.customerId },
      orderBy: [{ serviceDate: "desc" }, { id: "desc" }],
      take: 30,
      select: {
        id: true,
        serviceDate: true,
        status: true,
        quantity: true,
        menuItemNameSnapshot: true,
        unitPriceMinor: true,
        cancellationCutoffAt: true,
        mealType: { select: { name: true } },
      },
    }),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <Brand compact />
        <StatusPill tone="ready">Account active</StatusPill>
      </header>
      <section className="service-strip paper-panel mt-7 rounded-2xl p-5">
        <p className="utility-type text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--saffron-deep)]">{customer.business.name}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Hello, {customer.name}.</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Published meals and your order history are loaded from the production database.</p>
      </section>
      <CustomerOrderBoard serviceDate={today} menuItems={menu?.items ?? []} orders={orders} />
    </main>
  );
}
