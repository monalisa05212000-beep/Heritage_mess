import Link from "next/link";
import { redirect } from "next/navigation";

import { CustomerOrderBoard } from "@/components/customer/customer-order-board";
import { CustomerShell } from "@/components/customer/customer-shell";
import { getCustomerPrincipal } from "@/lib/auth/session";
import { addBusinessDays, businessDateFromKey, businessDateKey, cutoffAt, formatBusinessDate } from "@/lib/domain/time";
import { formatCutoffTime, formatServiceDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CustomerHomePage({ searchParams }: { searchParams: Promise<{ date?: string | string[] }> }) {
  const principal = await getCustomerPrincipal();
  if (!principal) redirect("/customer/access");
  const today = businessDateKey();
  const queryDate = (await searchParams).date;
  const serviceDate = typeof queryDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(queryDate) && queryDate >= today ? queryDate : today;
  const date = businessDateFromKey(serviceDate);
  const [customer, menu, orders, prices, closure] = await prisma.$transaction([
    prisma.customer.findUnique({ where: { id: principal.customerId }, select: { name: true, business: { select: { name: true } } } }),
    prisma.menu.findFirst({ where: { businessId: principal.businessId, menuDate: date, status: "PUBLISHED" }, select: { items: { orderBy: { mealType: { sortOrder: "asc" } }, select: { id: true, name: true, description: true, mealType: { select: { id: true, name: true, orderingCutoffMinutes: true } } } } } }),
    // Only the selected service date: the date strip above makes an all-dates list read as a bug.
    prisma.orderItem.findMany({ where: { businessId: principal.businessId, customerId: principal.customerId, serviceDate: date }, orderBy: { id: "desc" }, select: { id: true, status: true, quantity: true, menuItemNameSnapshot: true, unitPriceMinor: true, cancellationCutoffAt: true, mealType: { select: { id: true, name: true } } } }),
    prisma.price.findMany({ where: { businessId: principal.businessId, effectiveFrom: { lte: date }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }] }, orderBy: [{ mealType: { sortOrder: "asc" } }, { effectiveFrom: "desc" }], select: { mealTypeId: true, amountMinor: true } }),
    prisma.closureDay.findFirst({ where: { businessId: principal.businessId, closureDate: date, status: { in: ["PROCESSED", "CORRECTED"] } }, select: { id: true } }),
  ]);
  if (!customer) redirect("/customer/access");
  const priceByMealType = new Map<string, number>(); for (const price of prices) if (!priceByMealType.has(price.mealTypeId)) priceByMealType.set(price.mealTypeId, price.amountMinor);
  const dates = [today, addBusinessDays(today, 1), addBusinessDays(today, 2)];
  // Decided here, not in the client component: a client-side `new Date()` would
  // disagree with the server's markup for anyone rendering near the cutoff minute.
  const now = new Date();
  const serviceDateLabel = serviceDate === today ? "today" : formatServiceDate(date);
  return <CustomerShell businessName={customer.business.name}>
    <section className="service-strip paper-panel rounded-2xl p-5">
      <p className="utility-type text-[10px] font-bold uppercase tracking-[.1em] text-[var(--saffron-deep)]">{formatBusinessDate(serviceDate, { weekday: "long", day: "numeric", month: "short" })}</p>
      <h1 className="mt-2 text-2xl font-black sm:text-3xl">Good day, {customer.name}.</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Pick a day, then order from the published menu.</p>
      <div className="mt-4 flex flex-wrap gap-2">{dates.map((value) => <Link key={value} href={`/customer?date=${value}`} aria-current={value === serviceDate ? "page" : undefined} className={`inline-flex min-h-11 shrink-0 items-center rounded-xl px-3 py-2 text-sm font-bold ${value === serviceDate ? "bg-[var(--saffron)] text-white" : "border border-[var(--line)] bg-white"}`}>{value === today ? "Today" : formatServiceDate(businessDateFromKey(value))}</Link>)}</div>
    </section>
    <CustomerOrderBoard
      // Next strips search params from the page cache key, so switching dates would
      // otherwise reuse this component instance and carry its optimistic "Ordered"
      // state onto the wrong day. Remount per date.
      key={serviceDate}
      serviceDate={serviceDate}
      serviceDateLabel={serviceDateLabel}
      menuItems={menu?.items.map((item) => {
        // Mirror the refusals createOrder would raise, so the button is honest
        // before it is pressed rather than after. Coverage is deliberately left
        // out: it needs the whole entitlement/capacity check, and the account
        // page already warns a customer who has no plan at all.
        const priceMinor = priceByMealType.get(item.mealType.id) ?? null;
        const orderingCutoffAt = cutoffAt(date, item.mealType.orderingCutoffMinutes);
        const unavailableReason = closure
          ? "The mess is closed on this day."
          : priceMinor === null
            ? "No price has been set for this meal yet."
            : now >= orderingCutoffAt
              ? `Ordering closed at ${formatCutoffTime(orderingCutoffAt)}.`
              : null;
        return { ...item, priceMinor, unavailableReason };
      }) ?? []}
      orders={orders.map((order) => ({ ...order, cutoffPassed: now >= order.cancellationCutoffAt }))}
    />
  </CustomerShell>;
}
