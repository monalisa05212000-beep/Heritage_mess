import { describe, expect, it, vi } from "vitest";

import { deactivateCustomerAccess } from "../src/lib/domain/customers";
import { dateOnly } from "../src/lib/domain/time";

describe("customer deactivation", () => {
  it("includes today's confirmed orders when cancelling reservations", async () => {
    const tx = {
      idempotencyKey: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      },
      customer: {
        findFirst: vi.fn().mockResolvedValue({ id: "customer-1", businessId: "business-1" }),
        update: vi.fn().mockResolvedValue({}),
      },
      orderItem: { findMany: vi.fn().mockResolvedValue([]) },
      customerSession: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = { $transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)) };

    await deactivateCustomerAccess(prisma as never, { role: "ADMIN", businessId: "business-1", userId: "admin-1" }, "customer-1", "deactivate-1");

    const where = tx.orderItem.findMany.mock.calls[0][0].where;
    // serviceDate is a date-only column (UTC midnight); a timestamp `gt` comparison
    // would silently skip today's orders any time after midnight.
    expect(where.serviceDate).toEqual({ gte: dateOnly(new Date()) });

    // The per-order cancellation loop needs more than the default 5s
    // interactive-transaction timeout on a pooled serverless connection.
    const options = (prisma.$transaction.mock.calls[0] as unknown[])[1] as { timeout?: number } | undefined;
    expect(options?.timeout).toBeGreaterThanOrEqual(15_000);
  });
});
