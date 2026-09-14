"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";

type FieldErrors = Record<string, string[] | undefined>;

export function LoginForm() {
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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrors(payload.fieldErrors ?? {});
        setMessage(payload.error ?? "Sign-in could not be completed. Please try again.");
        setIsSubmitting(false);
        return;
      }
      // Keep the submitting state on: navigation to /admin renders the
      // dashboard on the server and can take many seconds on a cold start.
      router.replace("/admin");
      router.refresh();
      // Safety valve: if navigation silently bounces back to /login the form
      // stays mounted — re-enable the button so the user can retry.
      setTimeout(() => setIsSubmitting(false), 30_000);
    } catch {
      setMessage("Couldn’t reach Heritage Mess. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <InputField label="Email" name="email" type="email" autoComplete="email" error={errors.email?.[0]} required />
      <InputField label="Password" name="password" type="password" autoComplete="current-password" error={errors.password?.[0]} required />
      {message ? <p className="rounded-xl bg-[var(--danger-pale)] px-3.5 py-3 text-sm font-semibold text-[var(--danger)]" role="alert">{message}</p> : null}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

