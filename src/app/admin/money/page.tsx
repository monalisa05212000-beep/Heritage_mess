import { redirect } from "next/navigation";

import { MoneyBoard } from "@/components/admin/money-board";
import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/ui/status-pill";
import { getAdminPrincipal } from "@/lib/auth/session";
import { businessDateFromKey, businessDateKey, formatBusinessDate } from "@/lib/domain/time";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MoneyPage() {
  const principal = await getAdminPrincipal(); if (!principal) redirect("/login");
  const today = businessDateKey(); const currentDate = businessDateFromKey(today);
  const [admin, mealTypes, prices, rawCustomers] = await Promise.all([
    prisma.user.findUnique({ where: { id: principal.userId }, select: { name: true, business: { select: { name: true } } } }),
    prisma.mealType.findMany({ where: { businessId: principal.businessId, status: "ACTIVE" }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.price.findMany({ where: { businessId: principal.businessId }, orderBy: [{ mealType: { sortOrder: "asc" } }, { effectiveFrom: "asc" }], select: { id: true, amountMinor: true, effectiveFrom: true, effectiveTo: true, mealType: { select: { name: true } } } }),
    prisma.customer.findMany({ where: { businessId: principal.businessId }, orderBy: { name: "asc" }, select: { id: true, name: true, phone: true, ledgerEntries: { select: { amountMinor: true } } } }),
  ]);
  if (!admin) redirect("/login");
  const customers = rawCustomers.map((customer) => ({ id: customer.id, name: customer.name, phone: customer.phone, balanceMinor: customer.ledgerEntries.reduce((sum, entry) => sum + entry.amountMinor, 0) }));
  const activePrices = prices.filter((price) => price.effectiveFrom <= currentDate && (!price.effectiveTo || price.effectiveTo >= currentDate));
  const upcomingPrices = prices.filter((price) => price.effectiveFrom > currentDate);
  return <AppShell businessName={admin.business.name} adminName={admin.name}><div className="grid gap-5"><MoneyBoard today={today} mealTypes={mealTypes} customers={customers} /><section className="paper-panel rounded-2xl p-5"><h2 className="text-xl font-black">Current prices</h2><div className="mt-4 grid gap-3">{activePrices.length === 0 ? <p className="text-sm text-[var(--muted)]">No current price records exist.</p> : activePrices.map((price) => <article key={price.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--line)] p-4"><div><p className="font-bold">{price.mealType.name}</p><p className="mt-1 text-sm text-[var(--muted)]">Effective: {formatBusinessDate(price.effectiveFrom.toISOString().slice(0, 10), { day: "numeric", month: "short" })}{price.effectiveTo ? ` – ${formatBusinessDate(price.effectiveTo.toISOString().slice(0, 10), { day: "numeric", month: "short" })}` : " onwards"}</p></div><strong className="text-xl">₹{price.amountMinor / 100}</strong></article>)}</div><h2 className="mt-7 text-xl font-black">Upcoming prices</h2><div className="mt-4 grid gap-3">{upcomingPrices.length === 0 ? <p className="text-sm text-[var(--muted)]">No future prices scheduled.</p> : upcomingPrices.map((price) => <article key={price.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--line)] p-4"><div><p className="font-bold">{price.mealType.name}</p><p className="mt-1 text-sm text-[var(--muted)]">Effective from {formatBusinessDate(price.effectiveFrom.toISOString().slice(0, 10), { day: "numeric", month: "short", year: "numeric" })}</p></div><span className="flex gap-2"><StatusPill tone="pending">Scheduled</StatusPill><strong className="text-xl">₹{price.amountMinor / 100}</strong></span></article>)}</div></section><section className="paper-panel rounded-2xl p-5"><h2 className="text-xl font-black">Customer balances</h2><div className="mt-4 grid gap-3">{customers.length === 0 ? <p className="text-sm text-[var(--muted)]">No customer accounts yet.</p> : customers.map((customer) => <div key={customer.id} className="flex flex-wrap justify-between gap-3 rounded-xl border border-[var(--line)] p-4"><span><strong>{customer.name}</strong><small className="ml-2 text-[var(--muted)]">{customer.phone}</small></span><strong className={customer.balanceMinor > 0 ? "text-[var(--danger)]" : "text-[var(--leaf)]"}>₹{customer.balanceMinor / 100}</strong></div>)}</div></section></div></AppShell>;
}
