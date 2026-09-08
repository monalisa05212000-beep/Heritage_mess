import { redirect } from "next/navigation";

import { CustomerOrderBoard } from "@/components/customer/customer-order-board";
import { CustomerShell } from "@/components/customer/customer-shell";
import { getCustomerPrincipal } from "@/lib/auth/session";
import { addBusinessDays, businessDateFromKey, businessDateKey, formatBusinessDate } from "@/lib/domain/time";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CustomerHomePage({ searchParams }: { searchParams: Promise<{ date?: string | string[] }> }) {
  const principal = await getCustomerPrincipal();
  if (!principal) redirect("/customer/access");
  const today = businessDateKey();
  const queryDate = (await searchParams).date;
  const serviceDate = typeof queryDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(queryDate) && queryDate >= today ? queryDate : today;
  const date = businessDateFromKey(serviceDate);
  const [customer, menu, orders, prices] = await Promise.all([
    prisma.customer.findUnique({ where: { id: principal.customerId }, select: { name: true, business: { select: { name: true } } } }),
    prisma.menu.findFirst({ where: { businessId: principal.businessId, menuDate: date, status: "PUBLISHED" }, select: { items: { orderBy: { mealType: { sortOrder: "asc" } }, select: { id: true, name: true, description: true, mealType: { select: { id: true, name: true } } } } } }),
    prisma.orderItem.findMany({ where: { businessId: principal.businessId, customerId: principal.customerId }, orderBy: [{ serviceDate: "desc" }, { id: "desc" }], take: 30, select: { id: true, serviceDate: true, status: true, quantity: true, menuItemNameSnapshot: true, unitPriceMinor: true, cancellationCutoffAt: true, mealType: { select: { name: true } } } }),
    prisma.price.findMany({ where: { businessId: principal.businessId, effectiveFrom: { lte: date }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }] }, orderBy: [{ mealType: { sortOrder: "asc" } }, { effectiveFrom: "desc" }], select: { mealTypeId: true, amountMinor: true } }),
  ]);
  if (!customer) redirect("/customer/access");
  const priceByMealType = new Map<string, number>(); for (const price of prices) if (!priceByMealType.has(price.mealTypeId)) priceByMealType.set(price.mealTypeId, price.amountMinor);
  const dates = [today, addBusinessDays(today, 1), addBusinessDays(today, 2)];
  return <CustomerShell businessName={customer.business.name}><section className="service-strip paper-panel rounded-2xl p-5"><p className="utility-type text-[10px] font-bold uppercase tracking-[.1em] text-[var(--saffron-deep)]">{formatBusinessDate(serviceDate, { weekday: "long", day: "numeric", month: "short" })}</p><h1 className="mt-2 text-3xl font-black">Good day, {customer.name}.</h1><p className="mt-2 text-sm text-[var(--muted)]">Order from a published menu using your live account and meal coverage.</p><div className="mt-4 flex gap-2 overflow-x-auto">{dates.map((value) => <a key={value} href={`/customer?date=${value}`} className={`shrink-0 rounded-xl px-3 py-2 text-sm font-bold ${value === serviceDate ? "bg-[var(--saffron)] text-white" : "border border-[var(--line)] bg-white"}`}>{value === today ? "Today" : formatBusinessDate(value, { weekday: "short", day: "numeric", month: "short" })}</a>)}</div></section><CustomerOrderBoard serviceDate={serviceDate} menuItems={menu?.items.map((item) => ({ ...item, priceMinor: priceByMealType.get(item.mealType.id) ?? null })) ?? []} orders={orders} /></CustomerShell>;
}
