import { redirect } from "next/navigation";

import { CustomerShell } from "@/components/customer/customer-shell";
import { StatusPill } from "@/components/ui/status-pill";
import { getCustomerPrincipal } from "@/lib/auth/session";
import { describeLedgerEntry, formatMoney, formatServiceDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CustomerAccountPage() {
  const principal = await getCustomerPrincipal();
  if (!principal) redirect("/customer/access");
  const [customer, balance] = await prisma.$transaction([
    prisma.customer.findUnique({ where: { id: principal.customerId }, select: { name: true, phone: true, status: true, payAsYouGoEnabled: true, business: { select: { name: true, phone: true } }, subscriptions: { orderBy: { createdAt: "desc" }, take: 20, select: { id: true, type: true, status: true, startDate: true, endDate: true } }, ledgerEntries: { orderBy: { createdAt: "desc" }, take: 30, select: { id: true, amountMinor: true, description: true, createdAt: true } } } }),
    // Over every entry, not just the 30 shown: the balance is a number the customer
    // will pay against, so it has to agree with the admin's figure.
    prisma.ledgerEntry.aggregate({ where: { businessId: principal.businessId, customerId: principal.customerId }, _sum: { amountMinor: true } }),
  ]);
  if (!customer) redirect("/customer/access");
  const balanceMinor = balance._sum.amountMinor ?? 0;
  const balanceLabel = balanceMinor > 0 ? `${formatMoney(balanceMinor)} due` : balanceMinor < 0 ? `${formatMoney(-balanceMinor)} in credit` : "All settled";
  const activePlans = customer.subscriptions.filter((subscription) => subscription.status === "ACTIVE" || subscription.status === "SCHEDULED");
  // A customer with neither a plan nor pay-as-you-go cannot order at all, and the
  // ordering screen can only say so after they have already tried. Say it here.
  const cannotOrder = activePlans.length === 0 && !customer.payAsYouGoEnabled;
  return <CustomerShell businessName={customer.business.name}>
    <div className="grid gap-5">
      <section className="paper-panel rounded-2xl p-5">
        <p className="utility-type text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">Account</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">{customer.name}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{customer.phone}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill tone={customer.status === "ACTIVE" ? "ready" : "neutral"}>{customer.status === "ACTIVE" ? "Active" : "Inactive"}</StatusPill>
          <StatusPill tone={customer.payAsYouGoEnabled ? "ready" : "neutral"}>{customer.payAsYouGoEnabled ? "Pay as you go" : "Meal plan only"}</StatusPill>
        </div>
      </section>

      {cannotOrder ? (
        <section className="rounded-2xl border border-[var(--danger)] bg-[var(--danger-pale)] p-5">
          <h2 className="text-lg font-black text-[var(--danger)]">You cannot order meals yet</h2>
          <p className="mt-2 text-sm text-[var(--ink)]">Your account has no active meal plan and pay-as-you-go is switched off, so orders will be refused. Please ask {customer.business.name}{customer.business.phone ? ` (${customer.business.phone})` : ""} to set up a plan or enable pay-as-you-go.</p>
        </section>
      ) : null}

      <section className="paper-panel rounded-2xl p-5">
        <h2 className="text-xl font-black">Account balance</h2>
        <p className={`mt-2 text-3xl font-black ${balanceMinor > 0 ? "text-[var(--danger)]" : "text-[var(--leaf)]"}`}>{balanceLabel}</p>
        <p className="mt-1 text-sm text-[var(--muted)]">Worked out from the meals charged to you and the payments {customer.business.name} has recorded.</p>
      </section>

      <section className="paper-panel rounded-2xl p-5">
        <h2 className="text-xl font-black">Meal plans</h2>
        <div className="mt-4 grid gap-2">
          {customer.subscriptions.length === 0 ? <p className="text-sm text-[var(--muted)]">You have no meal plans.</p> : customer.subscriptions.map((subscription) => (
            <div key={subscription.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] p-3 text-sm">
              <span><strong>{subscription.type === "COUNT" ? "Meal count plan" : "Prepaid plan"}</strong> &middot; {formatServiceDate(subscription.startDate)} to {formatServiceDate(subscription.endDate)}</span>
              <StatusPill tone={subscription.status === "ACTIVE" ? "ready" : "neutral"}>{subscription.status}</StatusPill>
            </div>
          ))}
        </div>
      </section>

      <section className="paper-panel rounded-2xl p-5">
        <h2 className="text-xl font-black">Account activity</h2>
        <div className="mt-4 grid gap-2">
          {customer.ledgerEntries.length === 0 ? <p className="text-sm text-[var(--muted)]">Nothing has been charged or paid yet.</p> : customer.ledgerEntries.map((entry) => (
            <div key={entry.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-xl border border-[var(--line)] p-3 text-sm">
              <span className="min-w-0 break-words">
                <span className="font-semibold">{describeLedgerEntry(entry.description)}</span>
                <span className="block text-xs text-[var(--muted)]">{formatServiceDate(entry.createdAt)}</span>
              </span>
              <strong className={entry.amountMinor < 0 ? "text-[var(--leaf)]" : undefined}>{formatMoney(entry.amountMinor)}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  </CustomerShell>;
}
