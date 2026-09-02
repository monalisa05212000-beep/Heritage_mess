import { IdempotencyStatus, Prisma } from "@prisma/client";

import type { DomainActor, DomainTransaction } from "./context";
import { DomainError } from "./errors";

export async function beginIdempotentOperation(
  tx: DomainTransaction,
  actor: DomainActor,
  operation: string,
  key: string,
) {
  if (!key.trim()) throw new DomainError("An idempotency key is required.", "VALIDATION");

  const existing = await tx.idempotencyKey.findUnique({
    where: { businessId_operation_key: { businessId: actor.businessId, operation, key } },
  });
  if (existing?.status === IdempotencyStatus.SUCCEEDED) return { replay: existing.responseBody };
  if (existing?.status === IdempotencyStatus.PROCESSING) {
    throw new DomainError("This operation is already in progress.", "CONFLICT");
  }

  if (existing) {
    await tx.idempotencyKey.update({
      where: { id: existing.id },
      data: { status: IdempotencyStatus.PROCESSING, responseBody: Prisma.JsonNull, completedAt: null },
    });
  } else {
    await tx.idempotencyKey.create({
      data: {
        businessId: actor.businessId,
        actorUserId: actor.userId,
        customerId: actor.customerId,
        operation,
        key,
        status: IdempotencyStatus.PROCESSING,
      },
    });
  }
  return { replay: undefined };
}

export async function completeIdempotentOperation(
  tx: DomainTransaction,
  actor: DomainActor,
  operation: string,
  key: string,
  resourceType: string,
  resourceId: string,
  response: Prisma.InputJsonValue,
) {
  await tx.idempotencyKey.update({
    where: { businessId_operation_key: { businessId: actor.businessId, operation, key } },
    data: {
      status: IdempotencyStatus.SUCCEEDED,
      responseCode: 200,
      responseBody: response,
      resourceType,
      resourceId,
      completedAt: new Date(),
    },
  });
}
