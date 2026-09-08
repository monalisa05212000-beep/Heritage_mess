"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { InputField, TextareaField } from "@/components/ui/field";

type BusinessDetails = { name: string; phone: string; address: string | null };
type FieldErrors = Record<string, string[] | undefined>;

export function BusinessSettingsForm({ business }: { business: BusinessDetails }) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setMessage(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/settings/business", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrors(payload.fieldErrors ?? {});
        setMessage(payload.error ?? "Business settings could not be saved. No changes were made.");
        return;
      }
      setMessage("Business settings saved.");
    } catch {
      setMessage("Couldn’t reach Heritage Mess. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <InputField label="Business name" name="name" defaultValue={business.name} error={errors.name?.[0]} required />
      <InputField label="Business phone" name="phone" inputMode="tel" defaultValue={business.phone} error={errors.phone?.[0]} required />
      <TextareaField label="Address" name="address" defaultValue={business.address ?? ""} error={errors.address?.[0]} hint="Used on future invoices when supplied." />
      {message ? <p className={`rounded-xl px-3.5 py-3 text-sm font-semibold ${message === "Business settings saved." ? "bg-[var(--leaf-pale)] text-[var(--leaf)]" : "bg-[var(--danger-pale)] text-[var(--danger)]"}`} role="status">{message}</p> : null}
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? "Saving changes…" : "Save changes"}
      </Button>
    </form>
  );
}

