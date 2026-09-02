import { Prisma, ReservationStatus, SubscriptionStatus } from "@prisma/client";

import type { DomainTransaction } from "./context";
import { DomainError } from "./errors";
import { isDateWithin } from "./time";

export type AllocationInput = {
  businessId: string;
  customerId: string;
  mealTypeId: string;
  orderItemId: string;
  serviceDate: Date;
  quantity: number;
  actorUserId?: string;
};

export async function reservePrepaidFifo(tx: DomainTransaction, input: AllocationInput) {
  let remaining = input.quantity;
  const reservationIds: string[] = [];
  const entitlements = await tx.entitlement.findMany({
    where: {
      businessId: input.businessId,
      customerId: input.customerId,
      mealTypeId: input.mealTypeId,
      availableQuantity: { gt: 0 },
      OR: [
        { subscriptionId: null },
        {
          subscription: {
            is: {
              status: { in: [SubscriptionStatus.SCHEDULED, SubscriptionStatus.ACTIVE, SubscriptionStatus.ENDED] },
              startDate: { lte: input.serviceDate },
            },
          },
        },
      ],
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  for (const entitlement of entitlements) {
    if (!remaining) break;
    const quantity = Math.min(remaining, entitlement.availableQuantity);
    const updated = await tx.entitlement.updateMany({
      where: { id: entitlement.id, businessId: input.businessId, availableQuantity: { gte: quantity } },
      data: { availableQuantity: { decrement: quantity }, reservedQuantity: { increment: quantity } },
    });
    if (updated.count !== 1) continue;
    const reservation = await tx.prepaidReservation.create({
      data: {
        businessId: input.businessId,
        entitlementId: entitlement.id,
        orderItemId: input.orderItemId,
        quantity,
      },
    });
    await tx.entitlementEffect.create({
      data: {
        businessId: input.businessId,
        entitlementId: entitlement.id,
        prepaidReservationId: reservation.id,
        orderItemId: input.orderItemId,
        type: "RESERVED",
        quantity,
        effectKey: `order-item:${input.orderItemId}:entitlement:${entitlement.id}:reserved`,
        createdByUserId: input.actorUserId,
      },
    });
    reservationIds.push(reservation.id);
    remaining -= quantity;
  }
  if (remaining) throw new DomainError("No matching prepaid meals are available.", "INSUFFICIENT_CAPACITY");
  return reservationIds;
}

export async function reserveCountCapacity(tx: DomainTransaction, input: AllocationInput) {
  const periods = await tx.subscriptionCapacityPeriod.findMany({
    where: {
      businessId: input.businessId,
      mealTypeId: input.mealTypeId,
      periodStart: { lte: input.serviceDate },
      periodEnd: { gte: input.serviceDate },
      subscription: { is: { customerId: input.customerId, status: { in: [SubscriptionStatus.SCHEDULED, SubscriptionStatus.ACTIVE] } } },
    },
    orderBy: [{ periodStart: "asc" }, { createdAt: "asc" }],
  });
  for (const period of periods) {
    if (!isDateWithin(input.serviceDate, period.periodStart, period.periodEnd)) continue;
    const updated = await tx.subscriptionCapacityPeriod.updateMany({
      where: {
        id: period.id,
        businessId: input.businessId,
        reservedQuantity: { lte: period.capacityQuantity - period.consumedQuantity - input.quantity },
      },
      data: { reservedQuantity: { increment: input.quantity } },
    });
    if (updated.count !== 1) continue;
    const reservation = await tx.capacityReservation.create({
      data: {
        businessId: input.businessId,
        capacityPeriodId: period.id,
        orderItemId: input.orderItemId,
        quantity: input.quantity,
      },
    });
    await tx.capacityEffect.create({
      data: {
        businessId: input.businessId,
        capacityReservationId: reservation.id,
        capacityPeriodId: period.id,
        orderItemId: input.orderItemId,
        type: "RESERVED",
        quantity: input.quantity,
        effectKey: `order-item:${input.orderItemId}:capacity:${period.id}:reserved`,
        createdByUserId: input.actorUserId,
      },
    });
    return reservation.id;
  }
  throw new DomainError("No matching count-plan capacity is available.", "INSUFFICIENT_CAPACITY");
}

export async function releasePrepaidReservations(
  tx: DomainTransaction,
  businessId: string,
  orderItemId: string,
  reason: string,
  actorUserId?: string,
) {
  const reservations = await tx.prepaidReservation.findMany({
    where: { businessId, orderItemId, status: ReservationStatus.RESERVED },
  });
  for (const reservation of reservations) {
    const claimed = await tx.prepaidReservation.updateMany({
      where: { id: reservation.id, businessId, status: ReservationStatus.RESERVED },
      data: { status: ReservationStatus.RELEASED, releasedAt: new Date() },
    });
    if (claimed.count !== 1) continue;
    await tx.entitlement.update({
      where: { id: reservation.entitlementId },
      data: { availableQuantity: { increment: reservation.quantity }, reservedQuantity: { decrement: reservation.quantity } },
    });
    await tx.entitlementEffect.create({
      data: {
        businessId,
        entitlementId: reservation.entitlementId,
        prepaidReservationId: reservation.id,
        orderItemId,
        type: "RESERVATION_RELEASED",
        quantity: reservation.quantity,
        effectKey: `reservation:${reservation.id}:released`,
        reason,
        createdByUserId: actorUserId,
      },
    });
  }
}

export async function releaseCountReservations(
  tx: DomainTransaction,
  businessId: string,
  orderItemId: string,
  reason: string,
  actorUserId?: string,
) {
  const reservations = await tx.capacityReservation.findMany({
    where: { businessId, orderItemId, status: ReservationStatus.RESERVED },
  });
  for (const reservation of reservations) {
    const claimed = await tx.capacityReservation.updateMany({
      where: { id: reservation.id, businessId, status: ReservationStatus.RESERVED },
      data: { status: ReservationStatus.RELEASED, releasedAt: new Date() },
    });
    if (claimed.count !== 1) continue;
    await tx.subscriptionCapacityPeriod.update({
      where: { id: reservation.capacityPeriodId },
      data: { reservedQuantity: { decrement: reservation.quantity } },
    });
    await tx.capacityEffect.create({
      data: {
        businessId,
        capacityReservationId: reservation.id,
        capacityPeriodId: reservation.capacityPeriodId,
        orderItemId,
        type: "RELEASED",
        quantity: reservation.quantity,
        effectKey: `reservation:${reservation.id}:released`,
        reason,
        createdByUserId: actorUserId,
      },
    });
  }
}

export async function consumeReservations(tx: DomainTransaction, businessId: string, orderItemId: string, actorUserId?: string) {
  const prepaid = await tx.prepaidReservation.findMany({ where: { businessId, orderItemId, status: ReservationStatus.RESERVED } });
  for (const reservation of prepaid) {
    const claimed = await tx.prepaidReservation.updateMany({
      where: { id: reservation.id, businessId, status: ReservationStatus.RESERVED },
      data: { status: ReservationStatus.CONSUMED, consumedAt: new Date(), releasedAt: new Date() },
    });
    if (claimed.count !== 1) continue;
    await tx.entitlement.update({ where: { id: reservation.entitlementId }, data: { reservedQuantity: { decrement: reservation.quantity } } });
    await tx.entitlementEffect.create({
      data: { businessId, entitlementId: reservation.entitlementId, prepaidReservationId: reservation.id, orderItemId, type: "CONSUMED", quantity: reservation.quantity, effectKey: `reservation:${reservation.id}:consumed`, createdByUserId: actorUserId },
    });
  }
  const capacity = await tx.capacityReservation.findMany({ where: { businessId, orderItemId, status: ReservationStatus.RESERVED } });
  for (const reservation of capacity) {
    const claimed = await tx.capacityReservation.updateMany({
      where: { id: reservation.id, businessId, status: ReservationStatus.RESERVED },
      data: { status: ReservationStatus.CONSUMED, consumedAt: new Date(), releasedAt: new Date() },
    });
    if (claimed.count !== 1) continue;
    await tx.subscriptionCapacityPeriod.update({
      where: { id: reservation.capacityPeriodId },
      data: { reservedQuantity: { decrement: reservation.quantity }, consumedQuantity: { increment: reservation.quantity } },
    });
    await tx.capacityEffect.create({
      data: { businessId, capacityReservationId: reservation.id, capacityPeriodId: reservation.capacityPeriodId, orderItemId, type: "CONSUMED", quantity: reservation.quantity, effectKey: `reservation:${reservation.id}:consumed`, createdByUserId: actorUserId },
    });
  }
}
