import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/ui/status-pill";
import { getAdminPrincipal } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/login");
  const query = (await searchParams).q;
  const search = typeof query === "string" ? query.trim() : "";
  const [admin, customers] = await Promise.all([
    prisma.user.findUnique({ where: { id: principal.userId }, select: { name: true, business: { select: { name: true } } } }),
    prisma.customer.findMany({
      where: { businessId: principal.businessId, ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }] } : {}) },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: { id: true, name: true, phone: true, status: true, payAsYouGoEnabled: true, _count: { select: { orderItems: true, subscriptions: true } } },
    }),
  ]);
  if (!admin) redirect("/login");
  return <AppShell businessName={admin.business.name} adminName={admin.name}>
    <div className="grid gap-5">
      <section className="paper-panel rounded-2xl p-5"><p className="utility-type text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">Customers</p><h1 className="mt-1 text-3xl font-black tracking-tight">Customer records</h1><form className="mt-5 flex gap-2"><input name="q" defaultValue={search} className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-white px-3 text-sm" placeholder="Search customers…" /><button className="rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-bold">Search</button></form></section>
      <section className="grid gap-3">{customers.length === 0 ? <p className="paper-panel rounded-2xl p-5 text-sm text-[var(--muted)]">No customer records match this search.</p> : customers.map((customer) => <Link key={customer.id} href={`/admin/customers/${customer.id}`} className="paper-panel rounded-2xl p-5 transition hover:border-[var(--saffron)]"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black">{customer.name}</h2><p className="mt-1 text-sm text-[var(--muted)]">{customer.phone}</p></div><div className="flex gap-2"><StatusPill tone={customer.payAsYouGoEnabled ? "ready" : "neutral"}>{customer.payAsYouGoEnabled ? "PAYG" : "Plan only"}</StatusPill><StatusPill tone={customer.status === "ACTIVE" ? "ready" : "neutral"}>{customer.status}</StatusPill></div></div><p className="mt-3 text-xs font-semibold text-[var(--muted)]">{customer._count.orderItems} order items · {customer._count.subscriptions} subscriptions · View →</p></Link>)}</section>
    </div>
  </AppShell>;
}
