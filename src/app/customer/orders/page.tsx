import { redirect } from "next/navigation";

import { CustomerShell } from "@/components/customer/customer-shell";
import { StatusPill } from "@/components/ui/status-pill";
import { getCustomerPrincipal } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CustomerOrdersPage() {
  const principal = await getCustomerPrincipal(); if (!principal) redirect("/customer/access");
  const [customer, orders] = await Promise.all([
    prisma.customer.findUnique({ where: { id: principal.customerId }, select: { name: true, business: { select: { name: true } } } }),
    prisma.orderItem.findMany({ where: { businessId: principal.businessId, customerId: principal.customerId }, orderBy: [{ serviceDate: "desc" }, { id: "desc" }], take: 100, select: { id: true, serviceDate: true, status: true, quantity: true, menuItemNameSnapshot: true, unitPriceMinor: true, mealType: { select: { name: true } } } }),
  ]); if (!customer) redirect("/customer/access");
  return <CustomerShell businessName={customer.business.name}><section className="paper-panel rounded-2xl p-5"><p className="utility-type text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">Orders</p><h1 className="mt-1 text-3xl font-black">Order history</h1><div className="mt-5 grid gap-3">{orders.length === 0 ? <p className="text-sm text-[var(--muted)]">No orders yet.</p> : orders.map((order) => <article key={order.id} className="rounded-xl border border-[var(--line)] p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-bold">{order.mealType.name}</p><p className="mt-1 text-sm text-[var(--muted)]">{order.menuItemNameSnapshot} · qty {order.quantity} · ₹{order.unitPriceMinor / 100}</p></div><StatusPill tone={order.status === "CONFIRMED" ? "ready" : "neutral"}>{order.status}</StatusPill></div></article>)}</div></section></CustomerShell>;
}
