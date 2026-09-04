"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { InputField, TextareaField } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";

type MealTypeOption = {
  id: string;
  code: string;
  name: string;
};

type MenuItemView = {
  id: string;
  mealTypeId: string;
  name: string;
  description: string | null;
  mealType: MealTypeOption;
};

type MenuView = {
  id: string;
  status: "DRAFT" | "PUBLISHED" | "UNPUBLISHED";
  items: MenuItemView[];
} | null;

type CustomerView = {
  id: string;
  name: string;
  phone: string;
  status: string;
  payAsYouGoEnabled: boolean;
  _count: { orderItems: number; subscriptions: number };
};

type OrderView = {
  id: string;
  status: string;
  quantity: number;
  allocationKind: string;
  menuItemNameSnapshot: string;
  unitPriceMinor: number;
  customer: { name: string; phone: string };
  mealType: { name: string };
};

type PriceView = {
  id: string;
  mealTypeId: string;
  amountMinor: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  mealType: { id: string; code: string; name: string };
};

export function AdminDashboard({
  serviceDate,
  mealTypes,
  menu,
  customers,
  orders,
  prices,
}: {
  serviceDate: string;
  mealTypes: MealTypeOption[];
  menu: MenuView;
  customers: CustomerView[];
  orders: OrderView[];
  prices: PriceView[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const menuItemsByMealType = useMemo(() => new Map(menu?.items.map((item) => [item.mealTypeId, item]) ?? []), [menu]);

  async function submitJson(url: string, body: unknown, busy: string, success: string) {
    setBusyAction(busy);
    setMessage(null);
    setError(null);
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    setBusyAction(null);
    if (!response.ok) {
      setError(payload.error ?? "The request could not be completed.");
      return false;
    }
    setMessage(success);
    router.refresh();
    return true;
  }

  async function saveMenu(formElement: HTMLFormElement, publish: boolean) {
    const form = new FormData(formElement);
    const items = mealTypes.map((mealType) => ({
      mealTypeId: mealType.id,
      name: String(form.get(`dish-${mealType.id}`) ?? ""),
      description: String(form.get(`description-${mealType.id}`) ?? ""),
    }));
    await submitJson("/api/admin/menus", {
      menuDate: serviceDate,
      publish,
      items,
      idempotencyKey: crypto.randomUUID(),
    }, publish ? "publish-menu" : "save-menu", publish ? "Menu published." : "Menu saved as draft.");
  }

  async function unpublishMenu() {
    if (!menu) return;
    await submitJson("/api/admin/menus/unpublish", {
      menuId: menu.id,
      idempotencyKey: crypto.randomUUID(),
    }, "unpublish-menu", "Menu unpublished.");
  }

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const ok = await submitJson("/api/admin/customers", {
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      payAsYouGoEnabled: form.get("payAsYouGoEnabled") === "on",
      idempotencyKey: crypto.randomUUID(),
    }, "create-customer", "Customer saved.");
    if (ok) formElement.reset();
  }

  async function savePrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const mealTypeId = String(form.get("mealTypeId") ?? "");
    const rupees = Number(form.get("rupees") ?? 0);
    const effectiveFrom = String(form.get("effectiveFrom") ?? serviceDate);
    const effectiveTo = String(form.get("effectiveTo") ?? "").trim() || undefined;

    const ok = await submitJson("/api/admin/prices", {
      mealTypeId,
      amountMinor: Math.round(rupees * 100),
      effectiveFrom,
      effectiveTo,
      idempotencyKey: crypto.randomUUID(),
    }, "save-price", "Price updated successfully.");
    if (ok) event.currentTarget.reset();
  }

  return (
    <div className="grid gap-6">
      {message ? <p className="rounded-xl bg-[var(--leaf-pale)] px-3.5 py-3 text-sm font-semibold text-[var(--leaf)]" role="status">{message}</p> : null}
      {error ? <p className="rounded-xl bg-[var(--danger-pale)] px-3.5 py-3 text-sm font-semibold text-[var(--danger)]" role="alert">{error}</p> : null}

      <section className="paper-panel rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="utility-type text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Menu</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Service menu</h2>
          </div>
          <StatusPill tone={menu?.status === "PUBLISHED" ? "ready" : "neutral"}>{menu?.status ?? "Not created"}</StatusPill>
        </div>
        {mealTypes.length === 0 ? (
          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">No active meal types exist yet, so the menu domain service cannot accept menu items.</p>
        ) : (
          <form className="mt-5 grid gap-4" onSubmit={(event) => { event.preventDefault(); saveMenu(event.currentTarget, false); }}>
            {mealTypes.map((mealType) => {
              const item = menuItemsByMealType.get(mealType.id);
              return (
                <div key={mealType.id} className="grid gap-3 rounded-xl border border-[var(--line)] bg-white/70 p-4">
                  <InputField label={mealType.name} name={`dish-${mealType.id}`} defaultValue={item?.name ?? ""} required />
                  <TextareaField label={`${mealType.name} description`} name={`description-${mealType.id}`} defaultValue={item?.description ?? ""} />
                </div>
              );
            })}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={busyAction !== null}>{busyAction === "save-menu" ? "Saving…" : "Save draft"}</Button>
              <Button type="button" disabled={busyAction !== null} onClick={(event) => { if (event.currentTarget.form) saveMenu(event.currentTarget.form, true); }}>Publish menu</Button>
              {menu ? <Button type="button" variant="secondary" disabled={busyAction !== null || menu.status !== "PUBLISHED"} onClick={unpublishMenu}>{busyAction === "unpublish-menu" ? "Unpublishing…" : "Unpublish"}</Button> : null}
            </div>
          </form>
        )}
      </section>

      <section className="paper-panel rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="utility-type text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Pricing</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Meal pricing configuration</h2>
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <form className="grid gap-4 rounded-xl border border-[var(--line)] bg-white/70 p-4" onSubmit={savePrice}>
            <p className="font-extrabold text-sm text-[var(--ink)]">Set meal price</p>
            <div>
              <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Meal Type</label>
              <select name="mealTypeId" className="w-full rounded-lg border border-[var(--line)] bg-white p-2.5 text-sm font-semibold" required defaultValue={mealTypes[0]?.id}>
                {mealTypes.map((mt) => (
                  <option key={mt.id} value={mt.id}>{mt.name} ({mt.code})</option>
                ))}
              </select>
            </div>
            <InputField label="Price (₹)" name="rupees" type="number" step="1" min="0" defaultValue="60" required />
            <InputField label="Effective From" name="effectiveFrom" type="date" defaultValue={serviceDate} required />
            <InputField label="Effective To (Optional)" name="effectiveTo" type="date" />
            <Button type="submit" disabled={busyAction !== null}>{busyAction === "save-price" ? "Saving…" : "Save price"}</Button>
          </form>

          <div className="grid gap-3">
            <p className="font-extrabold text-sm text-[var(--ink)]">Active prices in database</p>
            {prices.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No price records exist yet. Use the form to configure meal prices.</p>
            ) : (
              prices.map((price) => (
                <article key={price.id} className="rounded-xl border border-[var(--line)] bg-white/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-extrabold text-base">{price.mealType.name}</p>
                      <p className="text-xs font-medium text-[var(--muted)]">
                        Effective: {new Date(price.effectiveFrom).toISOString().split("T")[0]}
                        {price.effectiveTo ? ` to ${new Date(price.effectiveTo).toISOString().split("T")[0]}` : " onwards"}
                      </p>
                    </div>
                    <span className="text-xl font-black text-[var(--saffron-deep)]">₹{price.amountMinor / 100}</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <form className="paper-panel grid gap-4 rounded-2xl p-5 sm:p-6" onSubmit={createCustomer}>
          <div>
            <p className="utility-type text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Customers</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Add customer</h2>
          </div>
          <InputField label="Name" name="name" required />
          <InputField label="Phone" name="phone" inputMode="tel" required />
          <label className="flex items-center gap-3 text-sm font-bold text-[var(--ink)]">
            <input name="payAsYouGoEnabled" type="checkbox" className="h-4 w-4" />
            Pay as you go enabled
          </label>
          <Button type="submit" disabled={busyAction !== null}>{busyAction === "create-customer" ? "Saving…" : "Save customer"}</Button>
        </form>

        <section className="paper-panel rounded-2xl p-5 sm:p-6">
          <h2 className="text-2xl font-black tracking-tight">Customer list</h2>
          <div className="mt-4 grid gap-3">
            {customers.length === 0 ? <p className="text-sm text-[var(--muted)]">No customers have been added yet.</p> : customers.map((customer) => (
              <article key={customer.id} className="rounded-xl border border-[var(--line)] bg-white/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold">{customer.name}</p>
                    <p className="text-sm text-[var(--muted)]">{customer.phone}</p>
                  </div>
                  <StatusPill tone={customer.status === "ACTIVE" ? "ready" : "neutral"}>{customer.status}</StatusPill>
                </div>
                <p className="mt-2 text-xs font-semibold text-[var(--muted)]">{customer._count.orderItems} orders · {customer._count.subscriptions} subscriptions · {customer.payAsYouGoEnabled ? "PAYG on" : "PAYG off"}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="paper-panel rounded-2xl p-5 sm:p-6">
        <h2 className="text-2xl font-black tracking-tight">Today’s orders</h2>
        <div className="mt-4 grid gap-3">
          {orders.length === 0 ? <p className="text-sm text-[var(--muted)]">No orders have been created for this service date.</p> : orders.map((order) => (
            <article key={order.id} className="rounded-xl border border-[var(--line)] bg-white/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-extrabold">{order.customer.name} · {order.mealType.name}</p>
                  <p className="text-sm text-[var(--muted)]">{order.menuItemNameSnapshot} · qty {order.quantity} · ₹{order.unitPriceMinor / 100}</p>
                </div>
                <StatusPill tone={order.status === "CONFIRMED" ? "ready" : "neutral"}>{order.status}</StatusPill>
              </div>
              <p className="mt-2 text-xs font-semibold text-[var(--muted)]">{order.allocationKind}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
