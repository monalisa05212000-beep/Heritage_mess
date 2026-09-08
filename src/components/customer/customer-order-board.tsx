"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";

type MenuItemView = {
  id: string;
  name: string;
  description: string | null;
  priceMinor: number | null;
  mealType: { id: string; name: string };
};

type OrderView = {
  id: string;
  serviceDate: Date | string;
  status: string;
  quantity: number;
  menuItemNameSnapshot: string;
  unitPriceMinor: number;
  cancellationCutoffAt: Date | string;
  mealType: { name: string };
};

export function CustomerOrderBoard({
  serviceDate,
  menuItems,
  orders,
}: {
  serviceDate: string;
  menuItems: MenuItemView[];
  orders: OrderView[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function submit(url: string, body: unknown, busy: string, success: string) {
    setBusyId(busy);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "The request could not be completed.");
        return;
      }
      setMessage(success);
      router.refresh();
    } catch {
      setError("Couldn’t reach Heritage Mess. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-6 grid gap-5">
      {message ? <p className="rounded-xl bg-[var(--leaf-pale)] px-3.5 py-3 text-sm font-semibold text-[var(--leaf)]" role="status">{message}</p> : null}
      {error ? <p className="rounded-xl bg-[var(--danger-pale)] px-3.5 py-3 text-sm font-semibold text-[var(--danger)]" role="alert">{error}</p> : null}

      <section className="paper-panel rounded-2xl p-5">
        <h2 className="text-2xl font-black tracking-tight">Available meals</h2>
        <div className="mt-4 grid gap-3">
          {menuItems.length === 0 ? <p className="text-sm text-[var(--muted)]">No published menu is available for this service date.</p> : menuItems.map((item) => (
            <article key={item.id} className="rounded-xl border border-[var(--line)] bg-white/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-extrabold">{item.mealType.name}</p>
                  <p className="text-sm font-semibold text-[var(--ink)]">{item.name}</p>
                  {item.priceMinor !== null ? <p className="mt-1 text-base font-black text-[var(--saffron-deep)]">₹{item.priceMinor / 100}</p> : null}
                  {item.description ? <p className="mt-1 text-sm text-[var(--muted)]">{item.description}</p> : null}
                </div>
                <Button
                  disabled={busyId !== null}
                  onClick={() => submit("/api/customer/orders", {
                    mealTypeId: item.mealType.id,
                    serviceDate,
                    quantity: 1,
                    idempotencyKey: crypto.randomUUID(),
                  }, `order-${item.id}`, "Order placed.")}
                >
                  {busyId === `order-${item.id}` ? "Ordering…" : "Order"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="paper-panel rounded-2xl p-5">
        <h2 className="text-2xl font-black tracking-tight">Your orders</h2>
        <div className="mt-4 grid gap-3">
          {orders.length === 0 ? <p className="text-sm text-[var(--muted)]">No orders yet.</p> : orders.map((order) => (
            <article key={order.id} className="rounded-xl border border-[var(--line)] bg-white/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-extrabold">{order.mealType.name} · {new Date(order.serviceDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
                  <p className="text-sm text-[var(--muted)]">{order.menuItemNameSnapshot} · qty {order.quantity} · ₹{order.unitPriceMinor / 100}</p>
                </div>
                <StatusPill tone={order.status === "CONFIRMED" ? "ready" : "neutral"}>{order.status}</StatusPill>
              </div>
              {order.status === "CONFIRMED" ? (
                <Button
                  variant="secondary"
                  className="mt-3 min-h-10 px-3 text-xs"
                  disabled={busyId !== null}
                  onClick={() => submit("/api/customer/orders/cancel", {
                    orderItemId: order.id,
                    idempotencyKey: crypto.randomUUID(),
                  }, `cancel-${order.id}`, "Order cancelled.")}
                >
                  {busyId === `cancel-${order.id}` ? "Cancelling…" : "Cancel order"}
                </Button>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
