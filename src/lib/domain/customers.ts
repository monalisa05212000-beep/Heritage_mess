import { AccountStatus, PrismaClient } from "@prisma/client";

import type { DomainActor } from "@/lib/domain/context";
import { requireAdmin, writeAudit } from "@/lib/domain/context";
import { DomainError } from "@/lib/domain/errors";
import { releaseCountReservations, releasePrepaidReservations } from "@/lib/domain/allocations";
import { reverseOrderCharge } from "@/lib/domain/finance";
import { beginIdempotentOperation, completeIdempotentOperation } from "@/lib/domain/idempotency";
import { normalizePhone } from "@/lib/domain/time";

export type CreateCustomerInput = {
  name: string;
  phone: string;
  payAsYouGoEnabled?: boolean;
  idempotencyKey: string;
};

export async function createCustomer(prisma: PrismaClient, actor: DomainActor, input: CreateCustomerInput) {
  requireAdmin(actor);
  const name = input.name.trim();
  if (!name) throw new DomainError("A customer name is required.", "VALIDATION");
  const normalizedPhone = normalizePhone(input.phone);

  return prisma.$transaction(async (tx) => {
    const operation = await beginIdempotentOperation(tx, actor, "customer.create", input.idempotencyKey);
    if (operation.replay) return operation.replay as { customerId: string; existing: boolean };

    const existing = await tx.customer.findUnique({
      where: { businessId_normalizedPhone: { businessId: actor.businessId, normalizedPhone } },
    });
    if (existing) {
      const response = { customerId: existing.id, existing: true };
      await completeIdempotentOperation(tx, actor, "customer.create", input.idempotencyKey, "customer", existing.id, response);
      return response;
    }

    const customer = await tx.customer.create({
      data: {
        businessId: actor.businessId,
        name,
        phone: input.phone.trim(),
        normalizedPhone,
        payAsYouGoEnabled: input.payAsYouGoEnabled ?? false,
      },
    });
    await writeAudit(tx, actor, "customer", customer.id, "CUSTOMER_CREATED", {
      name: customer.name,
      normalizedPhone: customer.normalizedPhone,
    });
    const response = { customerId: customer.id, existing: false };
    await completeIdempotentOperation(tx, actor, "customer.create", input.idempotencyKey, "customer", customer.id, response);
    return response;
  });
}

export async function updateCustomerPhone(
  prisma: PrismaClient,
  actor: DomainActor,
  customerId: string,
  phone: string,
  idempotencyKey: string,
) {
  requireAdmin(actor);
  const normalizedPhone = normalizePhone(phone);
  return prisma.$transaction(async (tx) => {
    const operation = await beginIdempotentOperation(tx, actor, "customer.phone.update", idempotencyKey);
    if (operation.replay) return operation.replay as { customerId: string };
    const customer = await tx.customer.findFirst({ where: { id: customerId, businessId: actor.businessId } });
    if (!customer) throw new DomainError("Customer was not found.", "NOT_FOUND");
    const duplicate = await tx.customer.findFirst({
      where: { businessId: actor.businessId, normalizedPhone, NOT: { id: customerId } },
    });
    if (duplicate) throw new DomainError("That phone number already belongs to another customer.", "CONFLICT");
    await tx.customer.update({ where: { id: customerId }, data: { phone: phone.trim(), normalizedPhone } });
    await writeAudit(tx, actor, "customer", customerId, "CUSTOMER_PHONE_CORRECTED", { normalizedPhone });
    const response = { customerId };
    await completeIdempotentOperation(tx, actor, "customer.phone.update", idempotencyKey, "customer", customerId, response);
    return response;
  });
}

export async function updateCustomerProfile(
  prisma: PrismaClient,
  actor: DomainActor,
  input: { customerId: string; name?: string; phone?: string; payAsYouGoEnabled?: boolean; idempotencyKey: string },
) {
  requireAdmin(actor);
  return prisma.$transaction(async (tx) => {
    const operation = await beginIdempotentOperation(tx, actor, "customer.profile.update", input.idempotencyKey);
    if (operation.replay) return operation.replay as { customerId: string };
    const customer = await tx.customer.findFirst({ where: { id: input.customerId, businessId: actor.businessId } });
    if (!customer) throw new DomainError("Customer was not found.", "NOT_FOUND");
    const name = input.name === undefined ? customer.name : input.name.trim();
    if (!name) throw new DomainError("A customer name is required.", "VALIDATION");
    const normalizedPhone = input.phone === undefined ? customer.normalizedPhone : normalizePhone(input.phone);
    const phone = input.phone === undefined ? customer.phone : input.phone.trim();
    const duplicate = await tx.customer.findFirst({ where: { businessId: actor.businessId, normalizedPhone, NOT: { id: customer.id } } });
    if (duplicate) throw new DomainError("That phone number already belongs to another customer.", "CONFLICT");
    const updated = await tx.customer.update({ where: { id: customer.id }, data: { name, phone, normalizedPhone, payAsYouGoEnabled: input.payAsYouGoEnabled ?? customer.payAsYouGoEnabled } });
    await writeAudit(tx, actor, "customer", customer.id, "CUSTOMER_UPDATED", {
      name: updated.name,
      normalizedPhone: updated.normalizedPhone,
      payAsYouGoEnabled: updated.payAsYouGoEnabled,
    });
    const response = { customerId: customer.id };
    await completeIdempotentOperation(tx, actor, "customer.profile.update", input.idempotencyKey, "customer", customer.id, response);
    return response;
  });
}

export async function setCustomerServiceAccess(
  prisma: PrismaClient,
  actor: DomainActor,
  customerId: string,
  payAsYouGoEnabled: boolean,
  idempotencyKey: string,
) {
  requireAdmin(actor);
  return prisma.$transaction(async (tx) => {
    const operation = await beginIdempotentOperation(tx, actor, "customer.payg.update", idempotencyKey);
    if (operation.replay) return operation.replay as { customerId: string };
    const customer = await tx.customer.findFirst({ where: { id: customerId, businessId: actor.businessId } });
    if (!customer) throw new DomainError("Customer was not found.", "NOT_FOUND");
    await tx.customer.update({ where: { id: customerId }, data: { payAsYouGoEnabled } });
    await writeAudit(tx, actor, "customer", customerId, "CUSTOMER_PAYG_UPDATED", { payAsYouGoEnabled });
    const response = { customerId };
    await completeIdempotentOperation(tx, actor, "customer.payg.update", idempotencyKey, "customer", customerId, response);
    return response;
  });
}

export async function deactivateCustomerAccess(
  prisma: PrismaClient,
  actor: DomainActor,
  customerId: string,
  idempotencyKey: string,
) {
  requireAdmin(actor);
  return prisma.$transaction(async (tx) => {
    const operation = await beginIdempotentOperation(tx, actor, "customer.deactivate", idempotencyKey);
    if (operation.replay) return operation.replay as { customerId: string };
    const customer = await tx.customer.findFirst({ where: { id: customerId, businessId: actor.businessId } });
    if (!customer) throw new DomainError("Customer was not found.", "NOT_FOUND");
    const futureOrders = await tx.orderItem.findMany({
      where: { businessId: actor.businessId, customerId, status: "CONFIRMED", serviceDate: { gt: new Date() } },
    });
    for (const order of futureOrders) {
      if (order.allocationKind === "PREPAID") await releasePrepaidReservations(tx, actor.businessId, order.id, "CUSTOMER_DEACTIVATED", actor.userId);
      if (order.allocationKind === "COUNT") await releaseCountReservations(tx, actor.businessId, order.id, "CUSTOMER_DEACTIVATED", actor.userId);
      if (order.allocationKind === "COUNT" || order.allocationKind === "PAYG") await reverseOrderCharge(tx, actor.businessId, order.id, "CUSTOMER_DEACTIVATED", actor.userId);
      await tx.orderItem.update({ where: { id: order.id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: "CUSTOMER_DEACTIVATED" } });
      await tx.orderItemEvent.create({ data: { businessId: actor.businessId, orderItemId: order.id, eventType: "ORDER_CANCELLED_BY_DEACTIVATION", effectKey: `order-item:${order.id}:deactivated`, createdByUserId: actor.userId } });
    }
    await tx.customer.update({ where: { id: customerId }, data: { status: AccountStatus.INACTIVE } });
    await tx.customerSession.updateMany({ where: { customerId }, data: { invalidatedAt: new Date() } });
    await writeAudit(tx, actor, "customer", customerId, "CUSTOMER_DEACTIVATED", { cancelledFutureOrders: futureOrders.length });
    const response = { customerId };
    await completeIdempotentOperation(tx, actor, "customer.deactivate", idempotencyKey, "customer", customerId, response);
    return response;
  });
}

export async function reactivateCustomerAccess(prisma: PrismaClient, actor: DomainActor, customerId: string, idempotencyKey: string) {
  requireAdmin(actor);
  return prisma.$transaction(async (tx) => {
    const operation = await beginIdempotentOperation(tx, actor, "customer.reactivate", idempotencyKey);
    if (operation.replay) return operation.replay as { customerId: string };
    const customer = await tx.customer.findFirst({ where: { id: customerId, businessId: actor.businessId } });
    if (!customer) throw new DomainError("Customer was not found.", "NOT_FOUND");
    const activeArrangement = customer.payAsYouGoEnabled || (await tx.subscription.count({ where: { businessId: actor.businessId, customerId, status: { in: ["SCHEDULED", "ACTIVE"] } } })) > 0 || (await tx.entitlement.count({ where: { businessId: actor.businessId, customerId, availableQuantity: { gt: 0 } } })) > 0;
    if (!activeArrangement) throw new DomainError("Customer needs a valid meal arrangement before reactivation.", "INVALID_STATE");
    await tx.customer.update({ where: { id: customerId }, data: { status: AccountStatus.ACTIVE } });
    await writeAudit(tx, actor, "customer", customerId, "CUSTOMER_REACTIVATED");
    const response = { customerId };
    await completeIdempotentOperation(tx, actor, "customer.reactivate", idempotencyKey, "customer", customerId, response);
    return response;
  });
}
