import { AccountStatus, AllocationKind, OrderItemStatus, OrderSource, PrismaClient, SubscriptionStatus, SubscriptionType } from "@prisma/client";

import type { DomainActor, DomainTransaction } from "@/lib/domain/context";
import { requireAdmin, requireCustomerAccess, requireCustomerInBusiness, writeAudit } from "@/lib/domain/context";
import { reserveCountCapacity, reservePrepaidFifo, releaseCountReservations, releasePrepaidReservations } from "@/lib/domain/allocations";
import { DomainError } from "@/lib/domain/errors";
import { createOrderCharge, reverseOrderCharge } from "@/lib/domain/finance";
import { beginIdempotentOperation, completeIdempotentOperation } from "@/lib/domain/idempotency";
import { cutoffAt, dateOnly } from "@/lib/domain/time";

export type CreateOrderInput = { customerId: string; serviceDate: Date; mealTypeId: string; quantity?: number; idempotencyKey: string };
export type AdminCancellationTreatment = { prepaid: "RESTORE" | "KEEP"; charge: "REVERSE" | "KEEP" };

async function coverageFor(tx: DomainTransaction, businessId: string, customerId: string, mealTypeId: string, serviceDate: Date, quantity: number) {
  const prepaid = await tx.entitlement.aggregate({
    where: {
      businessId, customerId, mealTypeId, availableQuantity: { gt: 0 },
      OR: [{ subscriptionId: null }, { subscription: { is: { status: { in: [SubscriptionStatus.SCHEDULED, SubscriptionStatus.ACTIVE, SubscriptionStatus.ENDED] }, startDate: { lte: serviceDate } } } }],
    },
    _sum: { availableQuantity: true },
  });
  if ((prepaid._sum.availableQuantity ?? 0) >= quantity) return AllocationKind.PREPAID;
  const count = await tx.subscriptionCapacityPeriod.findFirst({
    where: { businessId, mealTypeId, periodStart: { lte: serviceDate }, periodEnd: { gte: serviceDate }, subscription: { is: { customerId, type: SubscriptionType.COUNT, status: { in: [SubscriptionStatus.SCHEDULED, SubscriptionStatus.ACTIVE] }, startDate: { lte: serviceDate }, endDate: { gte: serviceDate } } } },
  });
  if (count) return AllocationKind.COUNT;
  const customer = await requireCustomerInBusiness(tx, businessId, customerId);
  if (customer.payAsYouGoEnabled) return AllocationKind.PAYG;
  throw new DomainError("No active meal plan covers this meal.", "INSUFFICIENT_CAPACITY");
}

async function createOrderInTransaction(tx: DomainTransaction, actor: DomainActor, input: CreateOrderInput, source: OrderSource, replacesOrderItemId?: string) {
  const quantity = input.quantity ?? 1;
  if (!Number.isInteger(quantity) || quantity <= 0) throw new DomainError("Meal quantity must be a positive whole number.", "VALIDATION");
  const customer = await requireCustomerInBusiness(tx, actor.businessId, input.customerId);
  if (customer.status !== AccountStatus.ACTIVE) throw new DomainError("Inactive customers cannot order meals.", "FORBIDDEN");
  const serviceDate = dateOnly(input.serviceDate);
  const meal = await tx.mealType.findFirst({ where: { id: input.mealTypeId, businessId: actor.businessId, status: "ACTIVE" } });
  if (!meal) throw new DomainError("Meal type was not found.", "NOT_FOUND");
  const closure = await tx.closureDay.findFirst({ where: { businessId: actor.businessId, closureDate: serviceDate, status: { in: ["PROCESSED", "CORRECTED"] } } });
  if (closure) throw new DomainError("This service date is closed.", "INVALID_STATE");
  const menuItem = await tx.menuItem.findFirst({ where: { businessId: actor.businessId, mealTypeId: meal.id, menu: { is: { businessId: actor.businessId, menuDate: serviceDate, status: "PUBLISHED" } } } });
  if (!menuItem) throw new DomainError("The menu is not published for this meal.", "INVALID_STATE");
  const price = await tx.price.findFirst({
    where: { businessId: actor.businessId, mealTypeId: meal.id, effectiveFrom: { lte: serviceDate }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: serviceDate } }] },
    orderBy: { effectiveFrom: "desc" },
  });
  if (!price) throw new DomainError("No active price exists for this meal.", "INVALID_STATE");
  const orderingCutoffAt = cutoffAt(serviceDate, meal.orderingCutoffMinutes);
  const cancellationCutoffAt = cutoffAt(serviceDate, meal.cancellationCutoffMinutes);
  if (actor.role === "CUSTOMER" && new Date() >= orderingCutoffAt) throw new DomainError("The ordering cutoff has passed.", "CUTOFF_PASSED");
  const allocationKind = await coverageFor(tx, actor.businessId, input.customerId, meal.id, serviceDate, quantity);
  const order = await tx.order.create({ data: { businessId: actor.businessId, customerId: input.customerId, serviceDate, source, createdByUserId: actor.userId } });
  const item = await tx.orderItem.create({
    data: { businessId: actor.businessId, orderId: order.id, customerId: input.customerId, serviceDate, mealTypeId: meal.id, source, quantity, allocationKind, menuItemNameSnapshot: menuItem.name, unitPriceMinor: price.amountMinor, orderingCutoffAt, cancellationCutoffAt, replacesOrderItemId },
  });
  if (allocationKind === AllocationKind.PREPAID) await reservePrepaidFifo(tx, { businessId: actor.businessId, customerId: input.customerId, mealTypeId: meal.id, orderItemId: item.id, serviceDate, quantity, actorUserId: actor.userId });
  if (allocationKind === AllocationKind.COUNT) await reserveCountCapacity(tx, { businessId: actor.businessId, customerId: input.customerId, mealTypeId: meal.id, orderItemId: item.id, serviceDate, quantity, actorUserId: actor.userId });
  if (allocationKind === AllocationKind.PAYG) await createOrderCharge(tx, { businessId: actor.businessId, customerId: input.customerId, orderItemId: item.id, quantity, unitPriceMinor: price.amountMinor, dueAt: orderingCutoffAt, actorUserId: actor.userId });
  await tx.orderItemEvent.create({ data: { businessId: actor.businessId, orderItemId: item.id, eventType: "ORDER_CONFIRMED", effectKey: `order-item:${item.id}:confirmed`, createdByUserId: actor.userId } });
  return item;
}

export async function createOrder(prisma: PrismaClient, actor: DomainActor, input: CreateOrderInput) {
  requireCustomerAccess(actor, input.customerId);
  const source = actor.role === "ADMIN" ? OrderSource.ADMIN_MANUAL : OrderSource.CUSTOMER;
  return prisma.$transaction(async (tx) => {
    const operation = await beginIdempotentOperation(tx, actor, "order.create", input.idempotencyKey);
    if (operation.replay) return operation.replay as { orderItemId: string };
    const item = await createOrderInTransaction(tx, actor, input, source);
    await writeAudit(tx, actor, "order_item", item.id, "ORDER_CREATED", { allocationKind: item.allocationKind });
    const response = { orderItemId: item.id };
    await completeIdempotentOperation(tx, actor, "order.create", input.idempotencyKey, "order_item", item.id, response);
    return response;
  }, { isolationLevel: "Serializable" });
}

export async function cancelOrderItem(
  prisma: PrismaClient,
  actor: DomainActor,
  orderItemId: string,
  idempotencyKey: string,
  treatment?: AdminCancellationTreatment,
) {
  return prisma.$transaction(async (tx) => {
    const operation = await beginIdempotentOperation(tx, actor, "order.cancel", idempotencyKey);
    if (operation.replay) return operation.replay as { orderItemId: string };
    const item = await tx.orderItem.findFirst({ where: { id: orderItemId, businessId: actor.businessId } });
    if (!item) throw new DomainError("Order item was not found.", "NOT_FOUND");
    requireCustomerAccess(actor, item.customerId);
    if (item.status !== OrderItemStatus.CONFIRMED) throw new DomainError("Only confirmed meals can be cancelled.", "INVALID_STATE");
    const isAfterCutoff = new Date() >= item.cancellationCutoffAt;
    if (actor.role === "CUSTOMER" && isAfterCutoff) throw new DomainError("The cancellation cutoff has passed.", "CUTOFF_PASSED");
    if (actor.role === "ADMIN") requireAdmin(actor);
    const prepaidTreatment = treatment?.prepaid ?? "RESTORE";
    const chargeTreatment = treatment?.charge ?? "REVERSE";
    if (item.allocationKind === AllocationKind.PREPAID && prepaidTreatment === "RESTORE") await releasePrepaidReservations(tx, actor.businessId, item.id, "ORDER_CANCELLED", actor.userId);
    if (item.allocationKind === AllocationKind.COUNT && chargeTreatment === "REVERSE") await releaseCountReservations(tx, actor.businessId, item.id, "ORDER_CANCELLED", actor.userId);
    if ((item.allocationKind === AllocationKind.COUNT || item.allocationKind === AllocationKind.PAYG) && chargeTreatment === "REVERSE") await reverseOrderCharge(tx, actor.businessId, item.id, "ORDER_CANCELLED", actor.userId);
    await tx.orderItem.update({ where: { id: item.id }, data: { status: OrderItemStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: "ORDER_CANCELLED" } });
    await tx.orderItemEvent.create({ data: { businessId: actor.businessId, orderItemId: item.id, eventType: "ORDER_CANCELLED", effectKey: `order-item:${item.id}:cancelled`, createdByUserId: actor.userId } });
    await writeAudit(tx, actor, "order_item", item.id, "ORDER_CANCELLED");
    const response = { orderItemId: item.id };
    await completeIdempotentOperation(tx, actor, "order.cancel", idempotencyKey, "order_item", item.id, response);
    return response;
  }, { isolationLevel: "Serializable" });
}

export async function replaceOrderItem(prisma: PrismaClient, actor: DomainActor, originalOrderItemId: string, replacement: Omit<CreateOrderInput, "customerId" | "idempotencyKey"> & { idempotencyKey: string }) {
  requireAdmin(actor);
  return prisma.$transaction(async (tx) => {
    const operation = await beginIdempotentOperation(tx, actor, "order.replace", replacement.idempotencyKey);
    if (operation.replay) return operation.replay as { originalOrderItemId: string; replacementOrderItemId: string };
    const original = await tx.orderItem.findFirst({ where: { id: originalOrderItemId, businessId: actor.businessId } });
    if (!original || original.status !== OrderItemStatus.CONFIRMED) throw new DomainError("A confirmed original order is required.", "INVALID_STATE");
    await cancelOrderItemInTransaction(tx, actor, original, { prepaid: "RESTORE", charge: "REVERSE" }, "REPLACED");
    const item = await createOrderInTransaction(tx, actor, { ...replacement, customerId: original.customerId }, OrderSource.REPLACEMENT, original.id);
    await tx.orderItemEvent.create({ data: { businessId: actor.businessId, orderItemId: item.id, eventType: "ORDER_REPLACED", effectKey: `order-item:${item.id}:replacement`, createdByUserId: actor.userId } });
    const response = { originalOrderItemId, replacementOrderItemId: item.id };
    await completeIdempotentOperation(tx, actor, "order.replace", replacement.idempotencyKey, "order_item", item.id, response);
    return response;
  }, { isolationLevel: "Serializable" });
}

async function cancelOrderItemInTransaction(tx: DomainTransaction, actor: DomainActor, item: { id: string; allocationKind: AllocationKind }, treatment: AdminCancellationTreatment, reason: string) {
  if (item.allocationKind === AllocationKind.PREPAID && treatment.prepaid === "RESTORE") await releasePrepaidReservations(tx, actor.businessId, item.id, reason, actor.userId);
  if (item.allocationKind === AllocationKind.COUNT && treatment.charge === "REVERSE") await releaseCountReservations(tx, actor.businessId, item.id, reason, actor.userId);
  if ((item.allocationKind === AllocationKind.COUNT || item.allocationKind === AllocationKind.PAYG) && treatment.charge === "REVERSE") await reverseOrderCharge(tx, actor.businessId, item.id, reason, actor.userId);
  await tx.orderItem.update({ where: { id: item.id }, data: { status: OrderItemStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: reason } });
}
