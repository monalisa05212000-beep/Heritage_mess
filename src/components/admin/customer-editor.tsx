"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";

export type CustomerDetails = {
  id: string;
  name: string;
  phone: string;
  status: "ACTIVE" | "INACTIVE";
  payAsYouGoEnabled: boolean;
};

export function CustomerEditor({ customer }: { customer: CustomerDetails }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function request(url: string, method: "POST" | "PATCH", body: unknown, action: string, success: string) {
    setBusy(action);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Customer could not be saved. Please try again.");
        return;
      }
      setMessage(success);
      router.refresh();
    } catch {
      setError("Couldn’t reach Heritage Mess. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    void request(`/api/admin/customers/${customer.id}`, "PATCH", {
      name: String(values.get("name") ?? ""),
      phone: String(values.get("phone") ?? ""),
      payAsYouGoEnabled: values.get("payAsYouGoEnabled") === "on",
      idempotencyKey: crypto.randomUUID(),
    }, "save", "Customer details saved.");
  }

  const action = customer.status === "ACTIVE" ? "deactivate" : "reactivate";
  return <div className="grid gap-5">
    {message ? <p className="rounded-xl bg-[var(--leaf-pale)] px-4 py-3 text-sm font-semibold text-[var(--leaf)]" role="status">{message}</p> : null}
    {error ? <p className="rounded-xl bg-[var(--danger-pale)] px-4 py-3 text-sm font-semibold text-[var(--danger)]" role="alert">{error}</p> : null}
    <form className="paper-panel grid gap-4 rounded-2xl p-5" onSubmit={save}>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">Customer details</h2><StatusPill tone={customer.status === "ACTIVE" ? "ready" : "neutral"}>{customer.status}</StatusPill></div>
      <InputField label="Name" name="name" defaultValue={customer.name} required />
      <InputField label="Phone" name="phone" defaultValue={customer.phone} inputMode="tel" required />
      <label className="flex items-center gap-3 text-sm font-bold"><input name="payAsYouGoEnabled" type="checkbox" defaultChecked={customer.payAsYouGoEnabled} /> PAYG enabled</label>
      <Button type="submit" disabled={busy !== null}>{busy === "save" ? "Saving…" : "Save customer"}</Button>
    </form>
    <section className="rounded-2xl border border-[var(--line)] bg-white/70 p-5">
      <h2 className="text-lg font-black">Service access</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Deactivation keeps the full customer, order, and financial history. It also cancels eligible future service and signs the customer out.</p>
      <Button className="mt-4" variant={customer.status === "ACTIVE" ? "danger" : "secondary"} disabled={busy !== null} onClick={() => void request(`/api/admin/customers/${customer.id}/${action}`, "POST", { idempotencyKey: crypto.randomUUID() }, action, customer.status === "ACTIVE" ? "Customer deactivated. Historical records were preserved." : "Customer reactivated.")}>{busy === action ? `${action === "deactivate" ? "Deactivating" : "Reactivating"}…` : customer.status === "ACTIVE" ? "Deactivate customer" : "Reactivate customer"}</Button>
    </section>
  </div>;
}
