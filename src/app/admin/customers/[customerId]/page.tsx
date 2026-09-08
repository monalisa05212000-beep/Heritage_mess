import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CustomerEditor } from "@/components/admin/customer-editor";
import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/ui/status-pill";
import { getAdminPrincipal } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CustomerPage({ params }: { params: Promise<{ customerId: string }> }) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/login");
  const { customerId } = await params;
  const [admin, customer] = await Promise.all([
    prisma.user.findUnique({ where: { id: principal.userId }, select: { name: true, business: { select: { name: true } } } }),
    prisma.customer.findFirst({ where: { id: customerId, businessId: principal.businessId }, select: { id: true, name: true, phone: true, status: true, payAsYouGoEnabled: true, orderItems: { orderBy: [{ serviceDate: "desc" }, { id: "desc" }], take: 20, select: { id: true, serviceDate: true, status: true, quantity: true, menuItemNameSnapshot: true, unitPriceMinor: true, mealType: { select: { name: true } } } }, subscriptions: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, type: true, status: true, startDate: true, endDate: true } }, ledgerEntries: { orderBy: { createdAt: "desc" }, take: 20, select: { id: true, type: true, amountMinor: true, description: true, createdAt: true } } } }),
  ]);
  if (!admin) redirect("/login");
  if (!customer) notFound();
  return <AppShell businessName={admin.business.name} adminName={admin.name}><div className="grid gap-5"><Link href="/admin/customers" className="text-sm font-bold text-[var(--saffron-deep)]">← Customers</Link><section className="paper-panel rounded-2xl p-5"><div className="flex items-start justify-between gap-3"><div><p className="utility-type text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">Customer</p><h1 className="mt-1 text-3xl font-black">{customer.name}</h1><p className="mt-2 text-sm text-[var(--muted)]">{customer.phone}</p></div><StatusPill tone={customer.status === "ACTIVE" ? "ready" : "neutral"}>{customer.status}</StatusPill></div></section><CustomerEditor customer={customer} /><section className="paper-panel rounded-2xl p-5"><h2 className="text-xl font-black">Orders</h2><div className="mt-4 grid gap-2">{customer.orderItems.length === 0 ? <p className="text-sm text-[var(--muted)]">No orders yet.</p> : customer.orderItems.map((order) => <div key={order.id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-[var(--line)] p-3 text-sm"><span><strong>{order.mealType.name}</strong> · {order.menuItemNameSnapshot} · qty {order.quantity}</span><StatusPill tone={order.status === "CONFIRMED" ? "ready" : "neutral"}>{order.status}</StatusPill></div>)}</div></section><section className="paper-panel rounded-2xl p-5"><h2 className="text-xl font-black">Subscriptions</h2><div className="mt-4 grid gap-2">{customer.subscriptions.length === 0 ? <p className="text-sm text-[var(--muted)]">No subscriptions on record.</p> : customer.subscriptions.map((subscription) => <p key={subscription.id} className="rounded-xl border border-[var(--line)] p-3 text-sm"><strong>{subscription.type}</strong> · {subscription.status}</p>)}</div></section><section className="paper-panel rounded-2xl p-5"><h2 className="text-xl font-black">Account history</h2><div className="mt-4 grid gap-2">{customer.ledgerEntries.length === 0 ? <p className="text-sm text-[var(--muted)]">No account activity yet.</p> : customer.ledgerEntries.map((entry) => <p key={entry.id} className="flex justify-between gap-3 rounded-xl border border-[var(--line)] p-3 text-sm"><span>{entry.description}</span><strong>₹{entry.amountMinor / 100}</strong></p>)}</div></section></div></AppShell>;
}
