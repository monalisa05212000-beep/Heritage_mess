"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatCutoffTime } from "@/lib/format";

/**
 * Shared by the order board and the order history page so both cancel a meal the
 * same way. `cutoffPassed` is decided on the server — computing "now" during a
 * client render would disagree with the server's markup around the cutoff minute.
 */
export function CancelOrderButton({
  orderItemId,
  cancellationCutoffAt,
  cutoffPassed,
  onCancelled,
}: {
  orderItemId: string;
  cancellationCutoffAt: Date | string;
  cutoffPassed: boolean;
  onCancelled?: () => void;
}) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (cutoffPassed && !isCancelled) {
    return <p className="mt-3 text-xs font-semibold text-[var(--muted)]">Cancellation closed at {formatCutoffTime(cancellationCutoffAt)}.</p>;
  }
  if (isCancelled) {
    return <p className="mt-3 text-xs font-semibold text-[var(--muted)]">Cancelled. Your account has been credited.</p>;
  }

  async function cancel() {
    if (!window.confirm("Cancel this meal? The charge will be reversed on your account.")) return;
    setIsCancelling(true);
    setError(null);
    try {
      const response = await fetch("/api/customer/orders/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderItemId, idempotencyKey: crypto.randomUUID() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "The meal could not be cancelled.");
        return;
      }
      setIsCancelled(true);
      onCancelled?.();
      router.refresh();
    } catch {
      setError("Couldn\u2019t reach Heritage Mess. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="mt-3">
      <Button variant="secondary" className="min-h-11 px-3 text-xs" disabled={isCancelling} onClick={cancel}>
        {isCancelling ? "Cancelling\u2026" : "Cancel meal"}
      </Button>
      <p className="mt-1.5 text-xs text-[var(--muted)]">You can cancel until {formatCutoffTime(cancellationCutoffAt)}.</p>
      {error ? <p className="mt-1.5 text-xs font-semibold text-[var(--danger)]" role="alert">{error}</p> : null}
    </div>
  );
}
