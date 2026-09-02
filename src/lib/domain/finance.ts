import { ChargeStatus, LedgerEntryType, PaymentMethod, Prisma, PrismaClient } from "@prisma/client";

import type { DomainActor, DomainTransaction } from "./context";
import { requireAdmin, requireCustomerInBusiness, writeAudit } from "./context";
import { DomainError } from "./errors";
import { beginIdempotentOperation, completeIdempotentOperation } from "./idempotency";

export async function createOrderCharge(
  tx: DomainTransaction,
  input: { businessId: string; customerId: string; orderItemId: string; quantity: number; unitPriceMinor: number; dueAt: Date; actorUserId?: string },
) {
  const existing = await tx.charge.findFirst({ where: { businessId: input.businessId, orderItemId: input.orderItemId } });
  if (existing) return existing;
  const amountMinor = input.quantity * input.unitPriceMinor;
  const ledger = await tx.ledgerEntry.create({
    data: {
      businessId: input.businessId,
      customerId: input.customerId,
      type: LedgerEntryType.CHARGE,
      amountMinor,
      description: "Meal charge",
      createdByUserId: input.actorUserId,
    },
  });
  try {
    return await tx.charge.create({
      data: {
        businessId: input.businessId,
        customerId: input.customerId,
        orderItemId: input.orderItemId,
        quantity: input.quantity,
        unitPriceMinor: input.unitPriceMinor,
        amountMinor,
        chargeDueAt: input.dueAt,
        ledgerEntryId: ledger.id,
      },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    await tx.ledgerEntry.delete({ where: { id: ledger.id } });
    const concurrent = await tx.charge.findFirst({ where: { businessId: input.businessId, orderItemId: input.orderItemId } });
    if (!concurrent) throw error;
    return concurrent;
  }
}

export async function reverseOrderCharge(
  tx: DomainTransaction,
  businessId: string,
  orderItemId: string,
  reason: string,
  actorUserId?: string,
) {
  const charge = await tx.charge.findFirst({ where: { businessId, orderItemId } });
  if (!charge || charge.status === ChargeStatus.REVERSED) return;
  const claimed = await tx.charge.updateMany({
    where: { id: charge.id, businessId, status: ChargeStatus.POSTED },
    data: { status: ChargeStatus.REVERSED, reversedAt: new Date() },
  });
  if (claimed.count !== 1) return;
  await tx.ledgerEntry.create({
    data: {
      businessId,
      customerId: charge.customerId,
      type: LedgerEntryType.REVERSAL,
      amountMinor: -charge.amountMinor,
      description: "Meal charge reversal",
      reason,
      reversesLedgerEntryId: charge.ledgerEntryId,
      createdByUserId: actorUserId,
    },
  });
}

export async function recordPayment(
  prisma: PrismaClient,
  actor: DomainActor,
  input: { customerId: string; amountMinor: number; paymentDate: Date; method: PaymentMethod; reference?: string; note?: string; idempotencyKey: string },
) {
  requireAdmin(actor);
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) throw new DomainError("Payment must be positive.", "VALIDATION");
  return prisma.$transaction(async (tx) => {
    const operation = await beginIdempotentOperation(tx, actor, "payment.record", input.idempotencyKey);
    if (operation.replay) return operation.replay as { paymentId: string };
    await requireCustomerInBusiness(tx, actor.businessId, input.customerId);
    if ((input.method === PaymentMethod.UPI || input.method === PaymentMethod.BANK_TRANSFER) && !input.reference?.trim() && !input.note?.trim()) {
      throw new DomainError("A transfer without a reference needs an explanatory note.", "VALIDATION");
    }
    const ledger = await tx.ledgerEntry.create({
      data: { businessId: actor.businessId, customerId: input.customerId, type: LedgerEntryType.PAYMENT, amountMinor: -input.amountMinor, description: "Customer payment", createdByUserId: actor.userId },
    });
    const payment = await tx.payment.create({
      data: { businessId: actor.businessId, customerId: input.customerId, amountMinor: input.amountMinor, paymentDate: input.paymentDate, method: input.method, reference: input.reference, note: input.note, recordedByUserId: actor.userId, ledgerEntryId: ledger.id },
    });
    await writeAudit(tx, actor, "payment", payment.id, "PAYMENT_RECORDED", { amountMinor: input.amountMinor });
    const response = { paymentId: payment.id };
    await completeIdempotentOperation(tx, actor, "payment.record", input.idempotencyKey, "payment", payment.id, response);
    return response;
  });
}

export async function recordAdjustment(
  prisma: PrismaClient,
  actor: DomainActor,
  input: { customerId: string; amountMinor: number; reason: string; referenceType?: string; referenceId?: string; idempotencyKey: string },
) {
  requireAdmin(actor);
  if (!Number.isInteger(input.amountMinor) || input.amountMinor === 0 || !input.reason.trim()) {
    throw new DomainError("Adjustment amount and reason are required.", "VALIDATION");
  }
  return prisma.$transaction(async (tx) => {
    const operation = await beginIdempotentOperation(tx, actor, "adjustment.record", input.idempotencyKey);
    if (operation.replay) return operation.replay as { adjustmentId: string };
    await requireCustomerInBusiness(tx, actor.businessId, input.customerId);
    const ledger = await tx.ledgerEntry.create({
      data: { businessId: actor.businessId, customerId: input.customerId, type: LedgerEntryType.ADJUSTMENT, amountMinor: input.amountMinor, description: "Financial adjustment", reason: input.reason, createdByUserId: actor.userId },
    });
    const adjustment = await tx.financialAdjustment.create({
      data: { businessId: actor.businessId, customerId: input.customerId, amountMinor: input.amountMinor, reason: input.reason, referenceType: input.referenceType, referenceId: input.referenceId, createdByUserId: actor.userId, ledgerEntryId: ledger.id },
    });
    await writeAudit(tx, actor, "financial_adjustment", adjustment.id, "ADJUSTMENT_RECORDED", { amountMinor: input.amountMinor }, input.reason);
    const response = { adjustmentId: adjustment.id };
    await completeIdempotentOperation(tx, actor, "adjustment.record", input.idempotencyKey, "financial_adjustment", adjustment.id, response);
    return response;
  });
}
