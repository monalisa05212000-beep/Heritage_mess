"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";

type MealType = { id: string; name: string };
type Customer = { id: string; name: string; phone: string; status: string };
type Order = { id: string; status: string; quantity: number; allocationKind: string; menuItemNameSnapshot: string; unitPriceMinor: number; customer: { name: string; phone: string }; mealType: { name: string } };

export function OrdersBoard({ serviceDate, mealTypes, customers, orders }: { serviceDate: string; mealTypes: MealType[]; customers: Customer[]; orders: Order[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(url: string, body: unknown, action: string, success: string) {
    setBusy(action); setMessage(null); setError(null);
    try {
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setError(payload.error ?? "Order could not be saved. Please try again."); return; }
      setMessage(success); router.refresh();
    } catch { setError("Couldn’t reach Heritage Mess. Please try again."); }
    finally { setBusy(null); }
  }

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    void send("/api/admin/orders/manual", { customerId: values.get("customerId"), mealTypeId: values.get("mealTypeId"), serviceDate, quantity: Number(values.get("quantity") ?? 1), idempotencyKey: crypto.randomUUID() }, "create", "Order created.");
  }

  return <div className="grid gap-5"><section className="paper-panel rounded-2xl p-5"><p className="utility-type text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">Orders</p><h1 className="mt-1 text-3xl font-black tracking-tight">Service date</h1><form className="mt-4 flex flex-wrap gap-2"><InputField label="Date" type="date" name="date" defaultValue={serviceDate} /><Button type="submit" variant="secondary">View date</Button></form></section>{message ? <p className="rounded-xl bg-[var(--leaf-pale)] px-4 py-3 text-sm font-semibold text-[var(--leaf)]" role="status">{message}</p> : null}{error ? <p className="rounded-xl bg-[var(--danger-pale)] px-4 py-3 text-sm font-semibold text-[var(--danger)]" role="alert">{error}</p> : null}<section className="paper-panel rounded-2xl p-5"><h2 className="text-xl font-black">Manual order</h2><p className="mt-1 text-sm text-[var(--muted)]">This uses the same menu, price, allocation, capacity and cutoff rules as customer orders.</p><form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={create}><label className="grid gap-1 text-sm font-semibold">Customer<select name="customerId" required className="min-h-12 rounded-xl border border-[var(--line)] bg-white px-3">{customers.filter((customer) => customer.status === "ACTIVE").map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone}</option>)}</select></label><label className="grid gap-1 text-sm font-semibold">Meal<select name="mealTypeId" required className="min-h-12 rounded-xl border border-[var(--line)] bg-white px-3">{mealTypes.map((meal) => <option key={meal.id} value={meal.id}>{meal.name}</option>)}</select></label><InputField label="Quantity" name="quantity" type="number" min="1" defaultValue="1" required /><div className="self-end"><Button type="submit" disabled={busy !== null || customers.filter((customer) => customer.status === "ACTIVE").length === 0 || mealTypes.length === 0}>{busy === "create" ? "Creating…" : "Create order"}</Button></div></form></section><section className="paper-panel rounded-2xl p-5"><h2 className="text-xl font-black">Orders for {serviceDate}</h2><div className="mt-4 grid gap-3">{orders.length === 0 ? <p className="text-sm text-[var(--muted)]">No orders for this service date.</p> : orders.map((order) => <article key={order.id} className="rounded-xl border border-[var(--line)] p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-bold">{order.customer.name} · {order.mealType.name}</p><p className="mt-1 text-sm text-[var(--muted)]">{order.menuItemNameSnapshot} · qty {order.quantity} · ₹{order.unitPriceMinor / 100} · {order.allocationKind}</p></div><StatusPill tone={order.status === "CONFIRMED" ? "ready" : "neutral"}>{order.status}</StatusPill></div>{order.status === "CONFIRMED" ? <Button className="mt-3 min-h-10 px-3 text-xs" variant="secondary" disabled={busy !== null} onClick={() => void send("/api/admin/orders/cancel", { orderItemId: order.id, idempotencyKey: crypto.randomUUID() }, `cancel-${order.id}`, "Order cancelled.")}>{busy === `cancel-${order.id}` ? "Cancelling…" : "Cancel order"}</Button> : null}</article>)}</div></section></div>;
}
