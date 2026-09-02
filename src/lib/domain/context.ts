import type { Prisma } from "@prisma/client";

import { DomainError } from "./errors";

export type DomainActor = {
  businessId: string;
  userId?: string;
  customerId?: string;
  role: "ADMIN" | "CUSTOMER" | "SYSTEM";
};

export type DomainTransaction = Prisma.TransactionClient;

export function requireAdmin(actor: DomainActor) {
  if (actor.role !== "ADMIN") throw new DomainError("Administrator access is required.", "FORBIDDEN");
}

export function requireCustomerAccess(actor: DomainActor, customerId: string) {
  if (actor.role === "ADMIN") return;
  if (actor.role !== "CUSTOMER" || actor.customerId !== customerId) {
    throw new DomainError("You cannot access this customer record.", "FORBIDDEN");
  }
}

export async function requireCustomerInBusiness(
  tx: DomainTransaction,
  businessId: string,
  customerId: string,
) {
  const customer = await tx.customer.findFirst({ where: { id: customerId, businessId } });
  if (!customer) throw new DomainError("Customer was not found.", "NOT_FOUND");
  return customer;
}

export async function writeAudit(
  tx: DomainTransaction,
  actor: DomainActor,
  entityType: string,
  entityId: string,
  action: string,
  afterData?: Prisma.InputJsonValue,
  reason?: string,
) {
  await tx.auditLog.create({
    data: {
      businessId: actor.businessId,
      actorUserId: actor.userId,
      entityType,
      entityId,
      action,
      afterData,
      reason,
    },
  });
}
