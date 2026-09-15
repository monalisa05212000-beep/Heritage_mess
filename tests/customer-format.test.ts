import { describe, expect, it } from "vitest";

import { describeLedgerEntry, formatMoney } from "../src/lib/format";

describe("customer-facing money formatting", () => {
  it("shows whole rupees without stray paise", () => {
    expect(formatMoney(9000)).toBe("\u20B990");
  });

  it("keeps paise when there are any, instead of 87.5", () => {
    expect(formatMoney(8750)).toBe("\u20B987.50");
  });

  it("marks a credit with a minus rather than rendering a negative rupee amount", () => {
    expect(formatMoney(-5000)).toBe("\u2212\u20B950");
  });

  it("formats zero as a plain amount", () => {
    expect(formatMoney(0)).toBe("\u20B90");
  });

  it("translates ledger bookkeeping into words a customer understands", () => {
    expect(describeLedgerEntry("Meal charge reversal")).toBe("Refund for a cancelled meal");
    expect(describeLedgerEntry("Customer payment")).toBe("Payment received");
  });

  it("passes through a description it does not recognise", () => {
    expect(describeLedgerEntry("Diwali hamper")).toBe("Diwali hamper");
  });
});
