import {
  LedgerEntryType,
  PaymentMethod,
  PrismaClient,
  SubscriptionStatus,
  SubscriptionType,
} from "@prisma/client";

import type { DomainActor } from "./context";
import { requireAdmin, requireCustomerInBusiness, writeAudit } from "./context";
import { DomainError } from "./errors";
import { beginIdempotentOperation, completeIdempotentOperation } from "./idempotency";
import { dateOnly } from "./time";
import { releasePrepaidReservations } from "./allocations";

export type SubscriptionItemInput = { mealTypeId: string; quantity: number; unitPriceMinor?: number };
export type CreateSubscriptionInput = {
  customerId: string;
  planTemplateId?: string;
  type: SubscriptionType;
  startDate: Date;
  requiredAmountMinor?: number;
  items?: SubscriptionItemInput[];
  idempotencyKey: string;
};

function endOfStartMonth(startDate: Date) {
  const date = dateOnly(startDate);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function initialStatus(type: SubscriptionType, startDate: Date, requiredAmountMinor: number | null) {
  if (type === SubscriptionType.PREPAID && (requiredAmountMinor ?? 0) > 0) return SubscriptionStatus.PENDING_PAYMENT;
  return dateOnly(startDate).getTime() > dateOnly(new Date()).getTime()
    ? SubscriptionStatus.SCHEDULED
    : SubscriptionStatus.ACTIVE;
}

export async function createSubscription(prisma: PrismaClient, actor: DomainActor, input: CreateSubscriptionInput) {
  requireAdmin(actor);
  if (input.requiredAmountMinor !== undefined && input.requiredAmountMinor < 0) {
    throw new DomainError("Required payment cannot be negative.", "VALIDATION");
  }
  if (input.items?.some((item) => !Number.isInteger(item.quantity) || item.quantity <= 0)) {
    throw new DomainError("Subscription quantities must be positive whole meals.", "VALIDATION");
  }
  return prisma.$transaction(async (tx) => {
    const operation = await beginIdempotentOperation(tx, actor, "subscription.create", input.idempotencyKey);
    if (operation.replay) return operation.replay as { subscriptionId: string };
    await requireCustomerInBusiness(tx, actor.businessId, input.customerId);
    const template = input.planTemplateId
      ? await tx.planTemplate.findFirst({
          where: { id: input.planTemplateId, businessId: actor.businessId, active: true },
          include: { items: true },
        })
      : null;
    if (input.planTemplateId && !template) throw new DomainError("Plan template was not found.", "NOT_FOUND");
    if (template && template.type !== input.type) throw new DomainError("Plan type does not match its template.", "VALIDATION");
    const items = input.items ?? template?.items.map((item) => ({ mealTypeId: item.mealTypeId, quantity: item.quantity })) ?? [];
    if (!items.length) throw new DomainError("A subscription needs at least one meal allocation.", "VALIDATION");
    const requiredAmountMinor = input.requiredAmountMinor ?? template?.requiredAmountMinor ?? null;
    const subscription = await tx.subscription.create({
      data: {
        businessId: actor.businessId,
        customerId: input.customerId,
        planTemplateId: template?.id,
        type: input.type,
        status: initialStatus(input.type, input.startDate, requiredAmountMinor),
        startDate: dateOnly(input.startDate),
        endDate: endOfStartMonth(input.startDate),
        requiredAmountMinor,
        items: { create: items.map((item) => ({ businessId: actor.businessId, ...item })) },
      },
    });
    if (subscription.type === SubscriptionType.COUNT) {
      const subscriptionItems = await tx.subscriptionItem.findMany({ where: { subscriptionId: subscription.id } });
      await tx.subscriptionCapacityPeriod.createMany({
        data: subscriptionItems.map((item) => ({
          businessId: actor.businessId,
          subscriptionId: subscription.id,
          subscriptionItemId: item.id,
          mealTypeId: item.mealTypeId,
          periodStart: subscription.startDate,
          periodEnd: subscription.endDate,
          capacityQuantity: item.quantity,
        })),
      });
    }
    if (subscription.type === SubscriptionType.PREPAID && (requiredAmountMinor ?? 0) === 0) {
      const subscriptionItems = await tx.subscriptionItem.findMany({ where: { subscriptionId: subscription.id } });
      for (const item of subscriptionItems) {
        const entitlement = await tx.entitlement.create({
          data: {
            businessId: actor.businessId,
            customerId: input.customerId,
            subscriptionId: subscription.id,
            mealTypeId: item.mealTypeId,
            issuedQuantity: item.quantity,
            availableQuantity: item.quantity,
          },
        });
        await tx.entitlementEffect.create({
          data: {
            businessId: actor.businessId,
            entitlementId: entitlement.id,
            type: "ISSUED",
            quantity: item.quantity,
            effectKey: `subscription:${subscription.id}:entitlement:${entitlement.id}:issued`,
            createdByUserId: actor.userId,
          },
        });
      }
    }
    await writeAudit(tx, actor, "subscription", subscription.id, "SUBSCRIPTION_CREATED", {
      type: subscription.type,
      startDate: subscription.startDate.toISOString(),
      endDate: subscription.endDate.toISOString(),
    });
    const response = { subscriptionId: subscription.id };
    await completeIdempotentOperation(tx, actor, "subscription.create", input.idempotencyKey, "subscription", subscription.id, response);
    return response;
  });
}

export type RecordPrepaidPaymentInput = {
  subscriptionId: string;
  amountMinor: number;
  method: PaymentMethod;
  paymentDate: Date;
  reference?: string;
  note?: string;
  idempotencyKey: string;
};

export async function recordPrepaidPayment(prisma: PrismaClient, actor: DomainActor, input: RecordPrepaidPaymentInput) {
  requireAdmin(actor);
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new DomainError("Payment must be a positive whole paise amount.", "VALIDATION");
  }
  return prisma.$transaction(async (tx) => {
    const operation = await beginIdempotentOperation(tx, actor, "subscription.prepaid.payment", input.idempotencyKey);
    if (operation.replay) return operation.replay as { subscriptionId: string; paymentId: string };
    const subscription = await tx.subscription.findFirst({
      where: { id: input.subscriptionId, businessId: actor.businessId, type: SubscriptionType.PREPAID },
      include: { items: true },
    });
    if (!subscription) throw new DomainError("Prepaid subscription was not found.", "NOT_FOUND");
    if (subscription.status === SubscriptionStatus.CANCELLED || subscription.status === SubscriptionStatus.ENDED) {
      throw new DomainError("This subscription cannot accept payment.", "INVALID_STATE");
    }
    if (subscription.status !== SubscriptionStatus.PENDING_PAYMENT) {
      throw new DomainError("This prepaid subscription no longer needs a payment.", "INVALID_STATE");
    }
    const required = subscription.requiredAmountMinor ?? 0;
    const nextPaidAmount = subscription.paidAmountMinor + input.amountMinor;
    if (nextPaidAmount > required && required > 0) {
      throw new DomainError("Payment exceeds the required prepaid enrolment amount.", "VALIDATION");
    }
    const ledger = await tx.ledgerEntry.create({
      data: {
        businessId: actor.businessId,
        customerId: subscription.customerId,
        type: LedgerEntryType.PAYMENT,
        amountMinor: -input.amountMinor,
        description: "Prepaid subscription payment",
        createdByUserId: actor.userId,
      },
    });
    const payment = await tx.payment.create({
      data: {
        businessId: actor.businessId,
        customerId: subscription.customerId,
        subscriptionId: subscription.id,
        amountMinor: input.amountMinor,
        paymentDate: input.paymentDate,
        method: input.method,
        reference: input.reference,
        note: input.note,
        recordedByUserId: actor.userId,
        ledgerEntryId: ledger.id,
      },
    });
    await tx.paymentApplication.create({
      data: {
        businessId: actor.businessId,
        paymentId: payment.id,
        customerId: subscription.customerId,
        subscriptionId: subscription.id,
        amountMinor: input.amountMinor,
      },
    });
    const fullyPaid = required === 0 || nextPaidAmount === required;
    const nextStatus = fullyPaid
      ? dateOnly(subscription.startDate).getTime() > dateOnly(new Date()).getTime()
        ? SubscriptionStatus.SCHEDULED
        : SubscriptionStatus.ACTIVE
      : SubscriptionStatus.PENDING_PAYMENT;
    await tx.subscription.update({
      where: { id: subscription.id },
      data: { paidAmountMinor: nextPaidAmount, status: nextStatus },
    });
    if (fullyPaid) {
      for (const item of subscription.items) {
        const entitlement = await tx.entitlement.create({
          data: {
            businessId: actor.businessId,
            customerId: subscription.customerId,
            subscriptionId: subscription.id,
            mealTypeId: item.mealTypeId,
            issuedQuantity: item.quantity,
            availableQuantity: item.quantity,
          },
        });
        await tx.entitlementEffect.create({
          data: {
            businessId: actor.businessId,
            entitlementId: entitlement.id,
            type: "ISSUED",
            quantity: item.quantity,
            effectKey: `subscription:${subscription.id}:entitlement:${entitlement.id}:issued`,
            createdByUserId: actor.userId,
          },
        });
      }
    }
    await writeAudit(tx, actor, "subscription", subscription.id, "PREPAID_PAYMENT_RECORDED", { paymentId: payment.id, amountMinor: input.amountMinor });
    const response = { subscriptionId: subscription.id, paymentId: payment.id };
    await completeIdempotentOperation(tx, actor, "subscription.prepaid.payment", input.idempotencyKey, "payment", payment.id, response);
    return response;
  });
}

export async function cancelPaidFuturePrepaidSubscription(
  prisma: PrismaClient,
  actor: DomainActor,
  subscriptionId: string,
  reason: string,
  idempotencyKey: string,
) {
  requireAdmin(actor);
  if (!reason.trim()) throw new DomainError("A cancellation reason is required.", "VALIDATION");
  return prisma.$transaction(async (tx) => {
    const operation = await beginIdempotentOperation(tx, actor, "subscription.future-prepaid.cancel", idempotencyKey);
    if (operation.replay) return operation.replay as { subscriptionId: string; creditMinor: number };
    const subscription = await tx.subscription.findFirst({
      where: { id: subscriptionId, businessId: actor.businessId, type: SubscriptionType.PREPAID },
      include: { entitlements: true },
    });
    if (!subscription) throw new DomainError("Prepaid subscription was not found.", "NOT_FOUND");
    if (subscription.status === SubscriptionStatus.CANCELLED) {
      const response = { subscriptionId, creditMinor: 0 };
      await completeIdempotentOperation(tx, actor, "subscription.future-prepaid.cancel", idempotencyKey, "subscription", subscriptionId, response);
      return response;
    }
    if (dateOnly(subscription.startDate) <= dateOnly(new Date()) || subscription.paidAmountMinor !== (subscription.requiredAmountMinor ?? 0)) {
      throw new DomainError("Only fully paid future-start prepaid subscriptions use this cancellation flow.", "INVALID_STATE");
    }
    const entitlements = subscription.entitlements.map((entitlement) => entitlement.id);
    const futureItems = await tx.orderItem.findMany({
      where: { businessId: actor.businessId, status: "CONFIRMED", prepaidReservations: { some: { entitlementId: { in: entitlements } } } },
    });
    for (const item of futureItems) {
      await releasePrepaidReservations(tx, actor.businessId, item.id, "FUTURE_PLAN_CANCELLED", actor.userId);
      await tx.orderItem.update({ where: { id: item.id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: "FUTURE_PLAN_CANCELLED" } });
      await tx.orderItemEvent.create({ data: { businessId: actor.businessId, orderItemId: item.id, eventType: "ORDER_CANCELLED_BY_PLAN", effectKey: `order-item:${item.id}:future-plan-cancelled`, reason, createdByUserId: actor.userId } });
    }
    const creditMinor = subscription.paidAmountMinor;
    const ledger = await tx.ledgerEntry.create({
      data: { businessId: actor.businessId, customerId: subscription.customerId, type: LedgerEntryType.CREDIT, amountMinor: -creditMinor, description: "Cancelled future prepaid plan credit", reason, createdByUserId: actor.userId },
    });
    await tx.financialAdjustment.create({
      data: { businessId: actor.businessId, customerId: subscription.customerId, amountMinor: -creditMinor, reason, referenceType: "subscription", referenceId: subscription.id, createdByUserId: actor.userId, ledgerEntryId: ledger.id },
    });
    await tx.paymentApplication.updateMany({ where: { businessId: actor.businessId, subscriptionId: subscription.id, releasedAt: null }, data: { releasedAt: new Date() } });
    await tx.subscription.update({ where: { id: subscription.id }, data: { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: reason } });
    await writeAudit(tx, actor, "subscription", subscription.id, "FUTURE_PREPAID_SUBSCRIPTION_CANCELLED", { creditMinor, cancelledOrders: futureItems.length }, reason);
    const response = { subscriptionId: subscription.id, creditMinor };
    await completeIdempotentOperation(tx, actor, "subscription.future-prepaid.cancel", idempotencyKey, "subscription", subscription.id, response);
    return response;
  }, { isolationLevel: "Serializable" });
}

export async function cancelPendingPrepaidEnrolment(
  prisma: PrismaClient,
  actor: DomainActor,
  subscriptionId: string,
  reason: string,
  idempotencyKey: string,
) {
  requireAdmin(actor);
  if (!reason.trim()) throw new DomainError("A cancellation reason is required.", "VALIDATION");
  return prisma.$transaction(async (tx) => {
    const operation = await beginIdempotentOperation(tx, actor, "subscription.pending-prepaid.cancel", idempotencyKey);
    if (operation.replay) return operation.replay as { subscriptionId: string };
    const subscription = await tx.subscription.findFirst({ where: { id: subscriptionId, businessId: actor.businessId, type: SubscriptionType.PREPAID, status: SubscriptionStatus.PENDING_PAYMENT } });
    if (!subscription) throw new DomainError("Pending prepaid enrolment was not found.", "NOT_FOUND");
    if (subscription.paidAmountMinor > 0) {
      const ledger = await tx.ledgerEntry.create({
        data: {
          businessId: actor.businessId,
          customerId: subscription.customerId,
          type: LedgerEntryType.CREDIT,
          amountMinor: -subscription.paidAmountMinor,
          description: "Cancelled prepaid enrolment credit",
          reason,
          createdByUserId: actor.userId,
        },
      });
      await tx.financialAdjustment.create({
        data: {
          businessId: actor.businessId,
          customerId: subscription.customerId,
          amountMinor: -subscription.paidAmountMinor,
          reason,
          referenceType: "subscription",
          referenceId: subscription.id,
          createdByUserId: actor.userId,
          ledgerEntryId: ledger.id,
        },
      });
    }
    await tx.paymentApplication.updateMany({ where: { businessId: actor.businessId, subscriptionId, releasedAt: null }, data: { releasedAt: new Date() } });
    await tx.subscription.update({ where: { id: subscriptionId }, data: { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: reason } });
    await writeAudit(tx, actor, "subscription", subscriptionId, "PENDING_PREPAID_ENROLMENT_CANCELLED", { releasedPaymentCreditMinor: subscription.paidAmountMinor }, reason);
    const response = { subscriptionId };
    await completeIdempotentOperation(tx, actor, "subscription.pending-prepaid.cancel", idempotencyKey, "subscription", subscriptionId, response);
    return response;
  });
}
