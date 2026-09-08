"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";

export function CustomerCreateForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: values.get("name"),
          phone: values.get("phone"),
          payAsYouGoEnabled: values.get("payAsYouGoEnabled") === "on",
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Customer could not be saved. Please try again.");
        return;
      }
      form.reset();
      setMessage(payload.existing ? "Customer already exists; the existing record was kept." : "Customer added.");
      router.refresh();
    } catch {
      setError("Couldn’t reach Heritage Mess. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="paper-panel rounded-2xl p-5">
      <h2 className="text-xl font-black">Add customer</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">Create a customer record without deleting or replacing existing history.</p>
      {message ? <p className="mt-4 rounded-xl bg-[var(--leaf-pale)] px-4 py-3 text-sm font-semibold text-[var(--leaf)]" role="status">{message}</p> : null}
      {error ? <p className="mt-4 rounded-xl bg-[var(--danger-pale)] px-4 py-3 text-sm font-semibold text-[var(--danger)]" role="alert">{error}</p> : null}
      <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={submit}>
        <InputField label="Name" name="name" required />
        <InputField label="Phone" name="phone" inputMode="tel" required />
        <label className="flex items-center gap-3 text-sm font-bold sm:col-span-2"><input name="payAsYouGoEnabled" type="checkbox" defaultChecked /> PAYG enabled</label>
        <div className="sm:col-span-2"><Button type="submit" disabled={busy}>{busy ? "Adding…" : "Add customer"}</Button></div>
      </form>
    </section>
  );
}
