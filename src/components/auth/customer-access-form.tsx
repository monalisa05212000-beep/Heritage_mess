"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";

type FieldErrors = Record<string, string[] | undefined>;

export function CustomerAccessForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setMessage(null);
    setIsSubmitting(true);
    const response = await fetch("/api/customer-access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
    });
    const payload = await response.json().catch(() => ({}));
    setIsSubmitting(false);
    if (!response.ok) {
      setErrors(payload.fieldErrors ?? {});
      setMessage(payload.error ?? "Customer access could not be started. Please try again.");
      return;
    }
    router.replace("/customer");
    router.refresh();
  }

  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <InputField label="Your name" name="name" autoComplete="name" error={errors.name?.[0]} required />
      <InputField label="Phone number" name="phone" inputMode="tel" autoComplete="tel" error={errors.phone?.[0]} required />
      {message ? <p className="rounded-xl bg-[var(--danger-pale)] px-3.5 py-3 text-sm font-semibold text-[var(--danger)]" role="alert">{message}</p> : null}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Opening your account…" : "Continue"}
      </Button>
    </form>
  );
}

