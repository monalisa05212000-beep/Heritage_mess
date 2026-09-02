import { AllocationKind, ChargeStatus, ClosureStatus, LedgerEntryType, OrderItemStatus, PrismaClient } from "@prisma/client";

import type { DomainActor } from "@/lib/domain/context";
import { requireAdmin, writeAudit } from "@/lib/domain/context";
import { consumeReservations, releaseCountReservations, releasePrepaidReservations } from "@/lib/domain/allocations";
import { DomainError } from "@/lib/domain/errors";
import { createOrderCharge, reverseOrderCharge } from "@/lib/domain/finance";
import { beginIdempotentOperation, completeIdempotentOperation } from "@/lib/domain/idempotency";
import { dateOnly } from "@/lib/domain/time";

export async function processClosure(
  prisma: PrismaClient,
  actor: DomainActor,
  input: { closureDate: Date; reason: string; idempotencyKey: string },
) {
  requireAdmin(actor);
  if (!input.reason.trim()) throw new DomainError("A closure reason is required.", "VALIDATION");
  const closureDate = dateOnly(input.closureDate);
  return prisma.$transaction(async (tx) => {
    const operation = await beginIdempotentOperation(tx, actor, "closure.process", input.idempotencyKey);
    if (operation.replay) return operation.replay as { closureId: string; affectedOrders: number };
    const closure = await tx.closureDay.upsert({
      where: { businessId_closureDate: { businessId: actor.businessId, closureDate } },
      create: { businessId: actor.businessId, closureDate, reason: input.reason, status: ClosureStatus.DRAFT, createdByUserId: actor.userId },
      update: {},
    });
    if (closure.status === ClosureStatus.PROCESSED) {
      const response = { closureId: closure.id, affectedOrders: 0 };
      await completeIdempotentOperation(tx, actor, "closure.process", input.idempotencyKey, "closure_day", closure.id, response);
      return response;
    }
    const items = await tx.orderItem.findMany({ where: { businessId: actor.businessId, serviceDate: closureDate, status: OrderItemStatus.CONFIRMED } });
    for (const item of items) {
      const effectKey = `closure:${closure.id}:order-item:${item.id}`;
      const priorEffect = await tx.closureEffect.findFirst({ where: { businessId: actor.businessId, closureDayId: closure.id, effectKey } });
      if (priorEffect) continue;
      if (item.allocationKind === AllocationKind.PREPAID) await releasePrepaidReservations(tx, actor.businessId, item.id, "CLOSURE", actor.userId);
      if (item.allocationKind === AllocationKind.COUNT) await releaseCountReservations(tx, actor.businessId, item.id, "CLOSURE", actor.userId);
      if (item.allocationKind === AllocationKind.COUNT || item.allocationKind === AllocationKind.PAYG) await reverseOrderCharge(tx, actor.businessId, item.id, "CLOSURE", actor.userId);
      await tx.orderItem.update({ where: { id: item.id }, data: { status: OrderItemStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: "CLOSURE" } });
      await tx.orderItemEvent.create({ data: { businessId: actor.businessId, orderItemId: item.id, eventType: "ORDER_CANCELLED_BY_CLOSURE", effectKey: `${effectKey}:cancelled`, reason: input.reason, createdByUserId: actor.userId } });
      await tx.closureEffect.create({ data: { businessId: actor.businessId, closureDayId: closure.id, orderItemId: item.id, effectKey } });
    }
    await tx.closureDay.update({ where: { id: closure.id }, data: { status: ClosureStatus.PROCESSED, processedAt: new Date() } });
    await writeAudit(tx, actor, "closure_day", closure.id, "CLOSURE_PROCESSED", { closureDate: closureDate.toISOString(), affectedOrders: items.length }, input.reason);
    const response = { closureId: closure.id, affectedOrders: items.length };
    await completeIdempotentOperation(tx, actor, "closure.process", input.idempotencyKey, "closure_day", closure.id, response);
    return response;
  }, { isolationLevel: "Serializable" });
}

export async function processCountChargesDue(prisma: PrismaClient, actor: DomainActor, asOf = new Date()) {
  if (actor.role !== "SYSTEM" && actor.role !== "ADMIN") throw new DomainError("System or administrator access is required.", "FORBIDDEN");
  return prisma.$transaction(async (tx) => {
    const due = await tx.orderItem.findMany({
      where: { businessId: actor.businessId, allocationKind: AllocationKind.COUNT, status: OrderItemStatus.CONFIRMED, cancellationCutoffAt: { lte: asOf }, charges: { none: {} } },
    });
    for (const item of due) {
      await createOrderCharge(tx, { businessId: actor.businessId, customerId: item.customerId, orderItemId: item.id, quantity: item.quantity, unitPriceMinor: item.unitPriceMinor, dueAt: item.cancellationCutoffAt, actorUserId: actor.userId });
      await tx.orderItemEvent.createMany({ data: [{ businessId: actor.businessId, orderItemId: item.id, eventType: "COUNT_CHARGE_POSTED", effectKey: `order-item:${item.id}:count-charge-posted`, createdByUserId: actor.userId }], skipDuplicates: true });
    }
    return { chargedOrderItems: due.length };
  }, { isolationLevel: "Serializable" });
}

export async function fulfilPastOrders(prisma: PrismaClient, actor: DomainActor, asOf = new Date()) {
  if (actor.role !== "SYSTEM" && actor.role !== "ADMIN") throw new DomainError("System or administrator access is required.", "FORBIDDEN");
  const today = dateOnly(asOf);
  return prisma.$transaction(async (tx) => {
    const due = await tx.orderItem.findMany({ where: { businessId: actor.businessId, status: OrderItemStatus.CONFIRMED, serviceDate: { lt: today } } });
    for (const item of due) {
      if (item.allocationKind === AllocationKind.PREPAID || item.allocationKind === AllocationKind.COUNT) await consumeReservations(tx, actor.businessId, item.id, actor.userId);
      await tx.orderItem.update({ where: { id: item.id }, data: { status: OrderItemStatus.COMPLETED, completedAt: asOf } });
      await tx.orderItemEvent.create({ data: { businessId: actor.businessId, orderItemId: item.id, eventType: "ORDER_FULFILLED", effectKey: `order-item:${item.id}:fulfilled`, createdByUserId: actor.userId } });
    }
    return { fulfilledOrderItems: due.length };
  }, { isolationLevel: "Serializable" });
}

export async function issueInvoice(
  prisma: PrismaClient,
  actor: DomainActor,
  input: { customerId: string; invoiceNumber: string; periodStart: Date; periodEnd: Date; idempotencyKey: string },
) {
  requireAdmin(actor);
  if (dateOnly(input.periodEnd) < dateOnly(input.periodStart) || !input.invoiceNumber.trim()) throw new DomainError("Invoice period and number are required.", "VALIDATION");
  return prisma.$transaction(async (tx) => {
    const operation = await beginIdempotentOperation(tx, actor, "invoice.issue", input.idempotencyKey);
    if (operation.replay) return operation.replay as { invoiceId: string };
    const charges = await tx.charge.findMany({
      where: { businessId: actor.businessId, customerId: input.customerId, status: ChargeStatus.POSTED, orderItem: { serviceDate: { gte: dateOnly(input.periodStart), lte: dateOnly(input.periodEnd) } }, invoiceItem: null },
      include: { orderItem: { include: { mealType: true } } },
    });
    if (!charges.length) throw new DomainError("No uninvoiced charges exist for this period.", "INVALID_STATE");
    const previous = await tx.ledgerEntry.aggregate({ where: { businessId: actor.businessId, customerId: input.customerId, createdAt: { lt: dateOnly(input.periodStart) } }, _sum: { amountMinor: true } });
    const payments = await tx.ledgerEntry.aggregate({ where: { businessId: actor.businessId, customerId: input.customerId, createdAt: { gte: dateOnly(input.periodStart), lte: dateOnly(input.periodEnd) }, type: "PAYMENT" }, _sum: { amountMinor: true } });
    const credits = await tx.ledgerEntry.aggregate({ where: { businessId: actor.businessId, customerId: input.customerId, createdAt: { gte: dateOnly(input.periodStart), lte: dateOnly(input.periodEnd) }, type: { in: ["CREDIT", "ADJUSTMENT", "REVERSAL"] }, amountMinor: { lt: 0 } }, _sum: { amountMinor: true } });
    const subtotalMinor = charges.reduce((total, charge) => total + charge.amountMinor, 0);
    const invoice = await tx.invoice.create({
      data: {
        businessId: actor.businessId,
        customerId: input.customerId,
        invoiceNumber: input.invoiceNumber.trim(),
        periodStart: dateOnly(input.periodStart),
        periodEnd: dateOnly(input.periodEnd),
        status: "ISSUED",
        subtotalMinor,
        previousBalanceMinor: previous._sum.amountMinor ?? 0,
        paymentsMinor: payments._sum.amountMinor ?? 0,
        creditsMinor: credits._sum.amountMinor ?? 0,
        outstandingMinor: (previous._sum.amountMinor ?? 0) + subtotalMinor + (payments._sum.amountMinor ?? 0) + (credits._sum.amountMinor ?? 0),
        issuedAt: new Date(),
        createdByUserId: actor.userId,
        items: { create: charges.map((charge) => ({ businessId: actor.businessId, chargeId: charge.id, orderItemId: charge.orderItemId, description: charge.orderItem.menuItemNameSnapshot, mealTypeName: charge.orderItem.mealType.name, quantity: charge.quantity, unitPriceMinor: charge.unitPriceMinor, totalMinor: charge.amountMinor })) },
      },
    });
    await tx.charge.updateMany({ where: { id: { in: charges.map((charge) => charge.id) } }, data: { status: ChargeStatus.INVOICED } });
    await writeAudit(tx, actor, "invoice", invoice.id, "INVOICE_ISSUED", { chargeCount: charges.length, subtotalMinor });
    const response = { invoiceId: invoice.id };
    await completeIdempotentOperation(tx, actor, "invoice.issue", input.idempotencyKey, "invoice", invoice.id, response);
    return response;
  }, { isolationLevel: "Serializable" });
}
