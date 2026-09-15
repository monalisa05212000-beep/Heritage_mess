import { BUSINESS_TIME_ZONE, businessDateKey, formatBusinessDate } from "@/lib/domain/time";

/** Money is stored in paise. Show whole rupees plainly, paise only when there are any. */
export function formatMoney(amountMinor: number) {
  const absolute = Math.abs(amountMinor);
  const rupees = absolute % 100 === 0 ? String(absolute / 100) : (absolute / 100).toFixed(2);
  return `${amountMinor < 0 ? "\u2212" : ""}\u20B9${rupees}`;
}

/** One date format everywhere a customer sees a service date: "Tue, 15 Sep". */
export function formatServiceDate(value: Date | string) {
  return formatBusinessDate(businessDateKey(new Date(value)), { weekday: "short", day: "numeric", month: "short" });
}

/** "8:00 pm" — used to tell a customer when cancellation closes. */
export function formatCutoffTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: BUSINESS_TIME_ZONE, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(value));
}

// Ledger descriptions are written for the books. Customers get plain English.
const LEDGER_WORDING: Record<string, string> = {
  "Meal charge": "Meal charge",
  "Meal charge reversal": "Refund for a cancelled meal",
  "Customer payment": "Payment received",
  "Financial adjustment": "Account adjustment",
  "Prepaid subscription payment": "Meal plan payment",
  "Cancelled future prepaid plan credit": "Credit for a cancelled meal plan",
};

export function describeLedgerEntry(description: string) {
  return LEDGER_WORDING[description] ?? description;
}
