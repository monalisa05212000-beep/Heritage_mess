"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CancelOrderButton } from "@/components/customer/cancel-order-button";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { formatMoney } from "@/lib/format";

type MenuItemView = {
  id: string;
  name: string;
  description: string | null;
  priceMinor: number | null;
  /** Set when the server is certain to refuse this meal; shown instead of an Order button. */
  unavailableReason: string | null;
  mealType: { id: string; name: string };
};

/** Orders arrive already scoped to `serviceDate` by the page. */
type OrderView = {
  id: string;
  status: string;
  quantity: number;
  menuItemNameSnapshot: string;
  unitPriceMinor: number;
  cancellationCutoffAt: Date | string;
  cutoffPassed: boolean;
  mealType: { id: string; name: string };
};

export function CustomerOrderBoard({
  serviceDateLabel,
  serviceDate,
  menuItems,
  orders,
}: {
  serviceDateLabel: string;
  serviceDate: string;
  menuItems: MenuItemView[];
  orders: OrderView[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orderingItemId, setOrderingItemId] = useState<string | null>(null);
  // Optimistic: router.refresh() takes seconds, so track the meals ordered and
  // cancelled in this session locally to keep the buttons honest in the meantime.
  const [justOrdered, setJustOrdered] = useState<string[]>([]);
  const [cancelledOrderIds, setCancelledOrderIds] = useState<string[]>([]);
  const isCancelled = (order: OrderView) => cancelledOrderIds.includes(order.id) || order.status === "CANCELLED";
  const orderedMealTypeIds = new Set([
    ...orders.filter((order) => order.status === "CONFIRMED" && !isCancelled(order)).map((order) => order.mealType.id),
    ...justOrdered,
  ]);

  async function placeOrder(item: MenuItemView) {
    setOrderingItemId(item.id);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/customer/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mealTypeId: item.mealType.id, serviceDate, quantity: 1, idempotencyKey: crypto.randomUUID() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "The order could not be placed.");
        return;
      }
      setMessage(`${item.mealType.name} ordered for ${serviceDateLabel}.`);
      setJustOrdered((previous) => [...previous, item.mealType.id]);
      router.refresh();
    } catch {
      setError("Couldn\u2019t reach Heritage Mess. Please try again.");
    } finally {
      setOrderingItemId(null);
    }
  }

  return (
    <div className="mt-6 grid gap-5">
      {message ? <p className="rounded-xl bg-[var(--leaf-pale)] px-3.5 py-3 text-sm font-semibold text-[var(--leaf)]" role="status">{message}</p> : null}
      {error ? <p className="rounded-xl bg-[var(--danger-pale)] px-3.5 py-3 text-sm font-semibold text-[var(--danger)]" role="alert">{error}</p> : null}

      <section className="paper-panel rounded-2xl p-5">
        <h2 className="text-2xl font-black tracking-tight">Available meals</h2>
        <div className="mt-4 grid gap-3">
          {menuItems.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No menu has been published for {serviceDateLabel} yet. Please check back later.</p>
          ) : menuItems.map((item) => {
            const isOrdered = orderedMealTypeIds.has(item.mealType.id);
            return (
              <article key={item.id} className="rounded-xl border border-[var(--line)] bg-white/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 break-words">
                    <p className="font-extrabold">{item.mealType.name}</p>
                    <p className="text-sm font-semibold text-[var(--ink)]">{item.name}</p>
                    {item.priceMinor !== null ? <p className="mt-1 text-base font-black text-[var(--saffron-deep)]">{formatMoney(item.priceMinor)}</p> : null}
                    {item.description ? <p className="mt-1 text-sm text-[var(--muted)]">{item.description}</p> : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <Button disabled={orderingItemId !== null || isOrdered || item.unavailableReason !== null} onClick={() => placeOrder(item)}>
                      {isOrdered ? "Ordered" : orderingItemId === item.id ? "Ordering\u2026" : "Order"}
                    </Button>
                    {item.unavailableReason && !isOrdered ? <p className="mt-1.5 max-w-[11rem] text-xs text-[var(--muted)]">{item.unavailableReason}</p> : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="paper-panel rounded-2xl p-5">
        <h2 className="text-2xl font-black tracking-tight">Your meals for {serviceDateLabel}</h2>
        <div className="mt-4 grid gap-3">
          {orders.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">You haven&rsquo;t ordered anything for {serviceDateLabel} yet.</p>
          ) : orders.map((order) => (
            <article key={order.id} className="rounded-xl border border-[var(--line)] bg-white/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 break-words">
                  <p className="font-extrabold">{order.mealType.name}</p>
                  <p className="text-sm text-[var(--muted)]">{order.menuItemNameSnapshot} &middot; qty {order.quantity} &middot; {formatMoney(order.unitPriceMinor * order.quantity)}</p>
                </div>
                <StatusPill tone={isCancelled(order) ? "neutral" : "ready"}>{isCancelled(order) ? "CANCELLED" : order.status}</StatusPill>
              </div>
              {order.status === "CONFIRMED" && !cancelledOrderIds.includes(order.id) ? (
                <CancelOrderButton
                  orderItemId={order.id}
                  cancellationCutoffAt={order.cancellationCutoffAt}
                  cutoffPassed={order.cutoffPassed}
                  onCancelled={() => {
                    setCancelledOrderIds((previous) => [...previous, order.id]);
                    setJustOrdered((previous) => previous.filter((id) => id !== order.mealType.id));
                  }}
                />
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
