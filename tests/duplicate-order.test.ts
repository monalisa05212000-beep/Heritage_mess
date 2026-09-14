import { describe, expect, it, vi } from "vitest";

import { Prisma } from "@prisma/client";

import { createOrder } from "../src/lib/domain/orders";
import { DomainError } from "../src/lib/domain/errors";

describe("duplicate order handling", () => {
  it("maps the P2002 duplicate-order constraint to a CONFLICT domain error", async () => {
    const duplicateError = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "6.6.0" });
    const tx = {
      idempotencyKey: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      },
      customer: {
        findFirst: vi.fn().mockResolvedValue({ id: "customer-1", businessId: "business-1", status: "ACTIVE", payAsYouGoEnabled: true }),
      },
      mealType: { findFirst: vi.fn().mockResolvedValue({ id: "meal-1", businessId: "business-1", status: "ACTIVE", orderingCutoffMinutes: 0, cancellationCutoffMinutes: 0 }) },
      closureDay: { findFirst: vi.fn().mockResolvedValue(null) },
      menuItem: { findFirst: vi.fn().mockResolvedValue({ id: "menu-item-1", name: "Poha" }) },
      price: { findFirst: vi.fn().mockResolvedValue({ id: "price-1", amountMinor: 6000 }) },
      entitlement: { aggregate: vi.fn().mockResolvedValue({ _sum: { availableQuantity: 0 } }) },
      subscriptionCapacityPeriod: { findFirst: vi.fn().mockResolvedValue(null) },
      order: { create: vi.fn().mockResolvedValue({ id: "order-1" }) },
      orderItem: { create: vi.fn().mockRejectedValue(duplicateError) },
    };
    const prisma = { $transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)) };

    const promise = createOrder(prisma as never, { role: "ADMIN", businessId: "business-1", userId: "admin-1" }, {
      customerId: "customer-1",
      serviceDate: new Date("2026-09-15T00:00:00Z"),
      mealTypeId: "meal-1",
      quantity: 1,
      idempotencyKey: "order-dup-1",
    });

    await expect(promise).rejects.toBeInstanceOf(DomainError);
    await expect(promise).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
