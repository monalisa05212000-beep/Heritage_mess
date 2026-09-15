import { redirect } from "next/navigation";

import { CancelOrderButton } from "@/components/customer/cancel-order-button";
import { CustomerShell } from "@/components/customer/customer-shell";
import { StatusPill } from "@/components/ui/status-pill";
import { getCustomerPrincipal } from "@/lib/auth/session";
import { ORDER_STATUS_WORDING, formatMoney, formatServiceDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CustomerOrdersPage() {
  const principal = await getCustomerPrincipal();
  if (!principal) redirect("/customer/access");
  const [customer, orders] = await prisma.$transaction([
    prisma.customer.findUnique({ where: { id: principal.customerId }, select: { name: true, business: { select: { name: true } } } }),
    prisma.orderItem.findMany({ where: { businessId: principal.businessId, customerId: principal.customerId }, orderBy: [{ serviceDate: "desc" }, { id: "desc" }], take: 100, select: { id: true, serviceDate: true, status: true, quantity: true, menuItemNameSnapshot: true, unitPriceMinor: true, cancellationCutoffAt: true, mealType: { select: { name: true } } } }),
  ]);
  if (!customer) redirect("/customer/access");
  // Cutoff is evaluated on the server so the markup can't disagree with a client clock.
  const now = new Date();
  return <CustomerShell businessName={customer.business.name}>
    <section className="paper-panel rounded-2xl p-5">
      <p className="utility-type text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">Orders</p>
      <h1 className="mt-1 text-2xl font-black sm:text-3xl">Your meals</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Every meal you have ordered, newest first. You can cancel a meal until its cutoff time.</p>
      <div className="mt-5 grid gap-3">
        {orders.length === 0 ? <p className="text-sm text-[var(--muted)]">You have not ordered any meals yet.</p> : orders.map((order) => (
          <article key={order.id} className="rounded-xl border border-[var(--line)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 break-words">
                <p className="font-extrabold">{formatServiceDate(order.serviceDate)} &middot; {order.mealType.name}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{order.menuItemNameSnapshot} &middot; qty {order.quantity} &middot; {formatMoney(order.unitPriceMinor * order.quantity)}</p>
              </div>
              <span className="shrink-0"><StatusPill tone={order.status === "CONFIRMED" ? "ready" : "neutral"}>{ORDER_STATUS_WORDING[order.status] ?? order.status}</StatusPill></span>
            </div>
            {order.status === "CONFIRMED" ? (
              <CancelOrderButton orderItemId={order.id} cancellationCutoffAt={order.cancellationCutoffAt} cutoffPassed={now >= order.cancellationCutoffAt} />
            ) : null}
          </article>
        ))}
      </div>
    </section>
  </CustomerShell>;
}
