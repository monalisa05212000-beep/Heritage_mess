"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";

type FieldErrors = Record<string, string[] | undefined>;

export function SetupForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setMessage(null);
    setIsSubmitting(true);

    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrors(payload.fieldErrors ?? {});
        setMessage(payload.error ?? "Initial setup could not be completed. No business or account was created.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setMessage("Couldn’t reach Heritage Mess. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <fieldset className="grid gap-4">
        <legend className="mb-1 text-sm font-extrabold text-[var(--ink)]">Business</legend>
        <InputField label="Business name" name="businessName" autoComplete="organization" error={errors.businessName?.[0]} required />
        <InputField label="Business phone" name="businessPhone" inputMode="tel" autoComplete="tel" error={errors.businessPhone?.[0]} required />
      </fieldset>
      <fieldset className="grid gap-4 border-t border-[var(--line)] pt-5">
        <legend className="mb-1 text-sm font-extrabold text-[var(--ink)]">First admin</legend>
        <InputField label="Your name" name="adminName" autoComplete="name" error={errors.adminName?.[0]} required />
        <InputField label="Admin email" name="adminEmail" type="email" autoComplete="email" error={errors.adminEmail?.[0]} required />
        <InputField
          label="Password"
          name="adminPassword"
          type="password"
          autoComplete="new-password"
          hint="Use 12 or more characters. It is never stored in plain text."
          error={errors.adminPassword?.[0]}
          required
        />
      </fieldset>
      {message ? <p className="rounded-xl bg-[var(--danger-pale)] px-3.5 py-3 text-sm font-semibold text-[var(--danger)]" role="alert">{message}</p> : null}
      <Button type="submit" disabled={isSubmitting} className="mt-1 w-full">
        {isSubmitting ? "Creating secure workspace…" : "Create workspace"}
      </Button>
    </form>
  );
}

