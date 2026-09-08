import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { BusinessClock } from "@/components/business-clock";
import { StatusPill } from "@/components/ui/status-pill";
import { getAdminPrincipal } from "@/lib/auth/session";
import { addBusinessDays, businessDateFromKey, businessDateKey, formatBusinessDate } from "@/lib/domain/time";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/login");
  const today = businessDateKey();
  const serviceDate = businessDateFromKey(today);
  const tomorrowKey = addBusinessDays(today, 1);
  const tomorrow = businessDateFromKey(tomorrowKey);
  const [admin, menu, tomorrowMenu, mealTypes, orders, cancelledToday, ledger] = await Promise.all([
    prisma.user.findUnique({ where: { id: principal.userId }, select: { name: true, business: { select: { name: true } } } }),
    prisma.menu.findUnique({ where: { businessId_menuDate: { businessId: principal.businessId, menuDate: serviceDate } }, select: { status: true, items: { orderBy: { mealType: { sortOrder: "asc" } }, select: { name: true, mealType: { select: { id: true, name: true } } } } } }),
    prisma.menu.findUnique({ where: { businessId_menuDate: { businessId: principal.businessId, menuDate: tomorrow } }, select: { status: true } }),
    prisma.mealType.findMany({ where: { businessId: principal.businessId, status: "ACTIVE" }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.orderItem.findMany({ where: { businessId: principal.businessId, serviceDate }, select: { status: true, quantity: true, mealTypeId: true, customer: { select: { name: true } }, mealType: { select: { name: true } } } }),
    prisma.orderItem.count({ where: { businessId: principal.businessId, serviceDate, status: "CANCELLED" } }),
    prisma.ledgerEntry.groupBy({ by: ["customerId"], where: { businessId: principal.businessId }, _sum: { amountMinor: true } }),
  ]);
  if (!admin) redirect("/login");
  const confirmedCount = (mealTypeId: string) => orders.filter((order) => order.mealTypeId === mealTypeId && order.status === "CONFIRMED").reduce((sum, order) => sum + order.quantity, 0);
  const unpaid = ledger.filter((entry) => (entry._sum.amountMinor ?? 0) > 0).length;
  return <AppShell businessName={admin.business.name} adminName={admin.name}><div className="grid gap-5">
    <section className="service-strip paper-panel rounded-2xl p-5 sm:p-7"><p className="utility-type text-[11px] font-bold uppercase tracking-[.1em] text-[var(--saffron-deep)]">Today · {formatBusinessDate(today, { weekday: "long", day: "numeric", month: "long" })} · <BusinessClock /></p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Today’s service board</h1><p className="mt-2 text-sm text-[var(--muted)]">A single view of today’s kitchen, customers and exceptions.</p></section>
    <section className="grid gap-3 sm:grid-cols-3">{mealTypes.map((meal) => <article key={meal.id} className="paper-panel rounded-2xl p-5"><p className="utility-type text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">{meal.name}</p><p className="mt-2 text-3xl font-black">{confirmedCount(meal.id)}</p><p className="mt-1 text-sm text-[var(--muted)]">confirmed meals</p></article>)}</section>
    <section className="paper-panel rounded-2xl p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="utility-type text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">Today’s menu</p><h2 className="mt-1 text-2xl font-black">Kitchen menu</h2></div><Link className="text-sm font-bold text-[var(--saffron-deep)]" href={`/admin/menus?date=${today}`}>Manage menu →</Link></div><div className="mt-4 grid gap-3 sm:grid-cols-3">{menu?.items.length ? menu.items.map((item) => <article key={item.mealType.id} className="rounded-xl border border-[var(--line)] bg-white/70 p-4"><p className="text-xs font-bold uppercase text-[var(--muted)]">{item.mealType.name}</p><p className="mt-2 font-black">{item.name}</p></article>) : <p className="text-sm text-[var(--muted)]">No menu has been created for today. <Link href={`/admin/menus?date=${today}`} className="font-bold text-[var(--saffron-deep)]">Create it now.</Link></p>}</div></section>
    <section className="paper-panel rounded-2xl p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-black">Today’s orders</h2><Link className="text-sm font-bold text-[var(--saffron-deep)]" href={`/admin/orders?date=${today}`}>View orders →</Link></div><div className="mt-4 grid gap-3">{orders.length === 0 ? <p className="text-sm text-[var(--muted)]">No orders have been placed for today.</p> : orders.slice(0, 10).map((order, index) => <div key={`${order.customer.name}-${order.mealType.name}-${index}`} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--line)] p-4"><p className="font-bold">{order.customer.name} · {order.mealType.name} · qty {order.quantity}</p><StatusPill tone={order.status === "CONFIRMED" ? "ready" : "neutral"}>{order.status}</StatusPill></div>)}</div></section>
    <section className="paper-panel rounded-2xl p-5"><h2 className="text-2xl font-black">Exceptions</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><p className="rounded-xl border border-[var(--line)] p-4 text-sm">⚠ {cancelledToday} cancellation{cancelledToday === 1 ? "" : "s"} today</p><p className="rounded-xl border border-[var(--line)] p-4 text-sm">⚠ {unpaid} unpaid account{unpaid === 1 ? "" : "s"}</p><p className="rounded-xl border border-[var(--line)] p-4 text-sm">{tomorrowMenu?.status === "PUBLISHED" ? "✓ Tomorrow’s menu is published" : "⚠ Tomorrow’s menu is not published"}</p></div></section>
  </div></AppShell>;
}
