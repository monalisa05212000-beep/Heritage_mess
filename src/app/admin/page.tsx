import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AppShell } from "@/components/app-shell";
import { BusinessClock } from "@/components/business-clock";
import { StatusPill } from "@/components/ui/status-pill";
import { getAdminPrincipal } from "@/lib/auth/session";
import { businessDateFromKey, businessDateKey } from "@/lib/domain/time";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/login");
  const today = businessDateKey();
  const serviceDate = businessDateFromKey(today);

  const admin = await prisma.user.findUnique({
    where: { id: principal.userId },
    select: { name: true, business: { select: { name: true } } },
  });
  if (!admin) redirect("/login");

  const [mealTypes, menu, customers, orders, prices] = await Promise.all([
    prisma.mealType.findMany({
      where: { businessId: principal.businessId, status: "ACTIVE" },
      orderBy: { sortOrder: "asc" },
      select: { id: true, code: true, name: true },
    }),
    prisma.menu.findUnique({
      where: { businessId_menuDate: { businessId: principal.businessId, menuDate: serviceDate } },
      select: {
        id: true,
        status: true,
        items: {
          orderBy: { mealType: { sortOrder: "asc" } },
          select: { id: true, mealTypeId: true, name: true, description: true, mealType: { select: { id: true, code: true, name: true } } },
        },
      },
    }),
    prisma.customer.findMany({
      where: { businessId: principal.businessId },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: { id: true, name: true, phone: true, status: true, payAsYouGoEnabled: true, _count: { select: { orderItems: true, subscriptions: true } } },
    }),
    prisma.orderItem.findMany({
      where: { businessId: principal.businessId, serviceDate },
      orderBy: [{ mealType: { sortOrder: "asc" } }, { id: "desc" }],
      select: {
        id: true,
        status: true,
        quantity: true,
        allocationKind: true,
        menuItemNameSnapshot: true,
        unitPriceMinor: true,
        customer: { select: { name: true, phone: true } },
        mealType: { select: { name: true } },
      },
    }),
    prisma.price.findMany({
      where: { businessId: principal.businessId },
      orderBy: [{ mealType: { sortOrder: "asc" } }, { effectiveFrom: "desc" }],
      select: {
        id: true,
        mealTypeId: true,
        amountMinor: true,
        effectiveFrom: true,
        effectiveTo: true,
        mealType: { select: { id: true, code: true, name: true } },
      },
    }),
  ]);

  return (
    <AppShell businessName={admin.business.name} adminName={admin.name}>
      <section className="service-strip paper-panel rounded-2xl p-5 sm:p-7">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="utility-type text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--saffron-deep)]">Today’s service · <BusinessClock /></p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-[var(--ink)] sm:text-4xl">Today’s service board</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">Menus, customers, and orders below are loaded from the production database.</p>
          </div>
          <StatusPill tone={menu?.status === "PUBLISHED" ? "ready" : "neutral"}>{menu?.status ?? "No menu"}</StatusPill>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3" aria-label="Today’s service summary">
        {[
          ["Orders", String(orders.length), "Meals on today’s service date"],
          ["Customers", String(customers.length), "Database customer records"],
          ["Meals", String(mealTypes.length), "Active meal types"],
        ].map(([label, value, hint]) => (
          <article key={label} className="paper-panel rounded-2xl p-4">
            <p className="utility-type text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{label}</p>
            <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
            <p className="mt-1 text-xs font-medium text-[var(--muted)]">{hint}</p>
          </article>
        ))}
      </section>

      <div className="mt-6"><AdminDashboard serviceDate={today} mealTypes={mealTypes} menu={menu} customers={customers} orders={orders} prices={prices} /></div>
      <p className="mt-5 text-xs font-semibold text-[var(--muted)]">
        Business details remain in <Link href="/admin/settings" className="text-[var(--saffron-deep)]">settings</Link>.
      </p>
    </AppShell>
  );
}
