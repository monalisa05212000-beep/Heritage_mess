import { ChargeStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { createOrderCharge, reverseOrderCharge } from "../src/lib/domain/finance";

describe("order financial effects", () => {
  it("creates one immutable charge and matching positive ledger entry", async () => {
    const tx = {
      charge: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: "charge-1" }) },
      ledgerEntry: { create: vi.fn().mockResolvedValue({ id: "ledger-1" }) },
    };

    const result = await createOrderCharge(tx as never, {
      businessId: "business-1", customerId: "customer-1", orderItemId: "order-1", quantity: 2, unitPriceMinor: 6000, dueAt: new Date(), actorUserId: "admin-1",
    });

    expect(result).toEqual({ id: "charge-1" });
    expect(tx.ledgerEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ amountMinor: 12000 }) }));
    expect(tx.charge.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ amountMinor: 12000, ledgerEntryId: "ledger-1" }) }));
  });

  it("does not duplicate an idempotent charge transition", async () => {
    const existing = { id: "charge-1" };
    const tx = { charge: { findFirst: vi.fn().mockResolvedValue(existing), create: vi.fn() }, ledgerEntry: { create: vi.fn() } };
    await expect(createOrderCharge(tx as never, { businessId: "business-1", customerId: "customer-1", orderItemId: "order-1", quantity: 1, unitPriceMinor: 6000, dueAt: new Date() })).resolves.toBe(existing);
    expect(tx.ledgerEntry.create).not.toHaveBeenCalled();
    expect(tx.charge.create).not.toHaveBeenCalled();
  });

  it("reverses a charge with a compensating negative ledger entry", async () => {
    const tx = {
      charge: { findFirst: vi.fn().mockResolvedValue({ id: "charge-1", customerId: "customer-1", amountMinor: 6000, ledgerEntryId: "ledger-1", status: ChargeStatus.POSTED }), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      ledgerEntry: { create: vi.fn().mockResolvedValue({ id: "reversal-1" }) },
    };
    await reverseOrderCharge(tx as never, "business-1", "order-1", "CLOSURE", "admin-1");
    expect(tx.ledgerEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ amountMinor: -6000, reversesLedgerEntryId: "ledger-1" }) }));
    expect(tx.charge.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: ChargeStatus.POSTED }), data: expect.objectContaining({ status: ChargeStatus.REVERSED }) }));
  });

  it("does not create a second reversal when another transaction already claimed the charge", async () => {
    const tx = {
      charge: { findFirst: vi.fn().mockResolvedValue({ id: "charge-1", customerId: "customer-1", amountMinor: 6000, ledgerEntryId: "ledger-1", status: ChargeStatus.POSTED }), updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      ledgerEntry: { create: vi.fn() },
    };

    await reverseOrderCharge(tx as never, "business-1", "order-1", "CLOSURE", "admin-1");
    expect(tx.ledgerEntry.create).not.toHaveBeenCalled();
  });
});
