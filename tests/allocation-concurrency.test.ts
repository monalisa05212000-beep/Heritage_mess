import { ReservationStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { consumeReservations, releaseCountReservations, releasePrepaidReservations } from "../src/lib/domain/allocations";

describe("reservation effect claims", () => {
  it("releases a prepaid reservation only when it wins the status claim", async () => {
    const tx = {
      prepaidReservation: {
        findMany: vi.fn().mockResolvedValue([{ id: "reservation-1", entitlementId: "entitlement-1", quantity: 1 }]),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      entitlement: { update: vi.fn() },
      entitlementEffect: { create: vi.fn() },
    };

    await releasePrepaidReservations(tx as never, "business-1", "order-1", "ORDER_CANCELLED");
    expect(tx.entitlement.update).not.toHaveBeenCalled();
    expect(tx.entitlementEffect.create).not.toHaveBeenCalled();
  });

  it("releases count capacity exactly once", async () => {
    const tx = {
      capacityReservation: {
        findMany: vi.fn().mockResolvedValue([{ id: "reservation-1", capacityPeriodId: "period-1", quantity: 2 }]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      subscriptionCapacityPeriod: { update: vi.fn() },
      capacityEffect: { create: vi.fn() },
    };

    await releaseCountReservations(tx as never, "business-1", "order-1", "ORDER_CANCELLED");
    expect(tx.subscriptionCapacityPeriod.update).toHaveBeenCalledTimes(1);
    expect(tx.capacityEffect.create).toHaveBeenCalledTimes(1);
    expect(tx.capacityReservation.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: ReservationStatus.RESERVED }),
    }));
  });

  it("consumes prepaid and count reservations only after claiming them", async () => {
    const tx = {
      prepaidReservation: {
        findMany: vi.fn().mockResolvedValue([{ id: "prepaid-1", entitlementId: "entitlement-1", quantity: 1 }]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      entitlement: { update: vi.fn() },
      entitlementEffect: { create: vi.fn() },
      capacityReservation: {
        findMany: vi.fn().mockResolvedValue([{ id: "capacity-1", capacityPeriodId: "period-1", quantity: 1 }]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      subscriptionCapacityPeriod: { update: vi.fn() },
      capacityEffect: { create: vi.fn() },
    };

    await consumeReservations(tx as never, "business-1", "order-1", "system-1");
    expect(tx.entitlement.update).toHaveBeenCalledTimes(1);
    expect(tx.subscriptionCapacityPeriod.update).toHaveBeenCalledTimes(1);
    expect(tx.entitlementEffect.create).toHaveBeenCalledTimes(1);
    expect(tx.capacityEffect.create).toHaveBeenCalledTimes(1);
  });
});
