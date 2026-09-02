import { describe, expect, it, vi } from "vitest";

import { cancelPendingPrepaidEnrolment } from "../src/lib/domain/subscriptions";

describe("prepaid enrolment cancellation", () => {
  it("turns a partial payment into an auditable customer credit", async () => {
    const tx = {
      idempotencyKey: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      },
      subscription: {
        findFirst: vi.fn().mockResolvedValue({ id: "subscription-1", customerId: "customer-1", paidAmountMinor: 10000 }),
        update: vi.fn().mockResolvedValue({}),
      },
      ledgerEntry: { create: vi.fn().mockResolvedValue({ id: "ledger-credit-1" }) },
      financialAdjustment: { create: vi.fn().mockResolvedValue({ id: "adjustment-1" }) },
      paymentApplication: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = { $transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)) };

    await cancelPendingPrepaidEnrolment(prisma as never, { role: "ADMIN", businessId: "business-1", userId: "admin-1" }, "subscription-1", "Customer requested cancellation", "cancel-1");

    expect(tx.ledgerEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ amountMinor: -10000 }) }));
    expect(tx.financialAdjustment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ amountMinor: -10000, ledgerEntryId: "ledger-credit-1" }) }));
    expect(tx.paymentApplication.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.subscription.update).toHaveBeenCalledTimes(1);
  });
});
