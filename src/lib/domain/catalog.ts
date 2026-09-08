import { MenuStatus, PrismaClient } from "@prisma/client";

import type { DomainActor, DomainTransaction } from "./context";
import { requireAdmin, writeAudit } from "./context";
import { DomainError } from "./errors";
import { beginIdempotentOperation, completeIdempotentOperation } from "./idempotency";
import { dateOnly } from "./time";

export const DEFAULT_MEAL_TYPES = [
  { code: "BREAKFAST", name: "Breakfast", sortOrder: 1, orderingCutoffMinutes: 420, cancellationCutoffMinutes: 420 },
  { code: "LUNCH", name: "Lunch", sortOrder: 2, orderingCutoffMinutes: 660, cancellationCutoffMinutes: 660 },
  { code: "DINNER", name: "Dinner", sortOrder: 3, orderingCutoffMinutes: 1080, cancellationCutoffMinutes: 1080 },
] as const;

export async function initializeDefaultMealTypesInTransaction(
  tx: DomainTransaction,
  businessId: string,
  actorUserId?: string,
) {
  const actor: DomainActor = { businessId, userId: actorUserId, role: "SYSTEM" };
  const createdMealTypes = [];

  for (const def of DEFAULT_MEAL_TYPES) {
    const mealType = await tx.mealType.create({
      data: {
        businessId,
        code: def.code,
        name: def.name,
        sortOrder: def.sortOrder,
        orderingCutoffMinutes: def.orderingCutoffMinutes,
        cancellationCutoffMinutes: def.cancellationCutoffMinutes,
        status: "ACTIVE",
      },
    });
    createdMealTypes.push(mealType);
    await writeAudit(tx, actor, "meal_type", mealType.id, "MEAL_TYPE_CREATED", {
      code: mealType.code,
      name: mealType.name,
      orderingCutoffMinutes: mealType.orderingCutoffMinutes,
      cancellationCutoffMinutes: mealType.cancellationCutoffMinutes,
    });
  }

  return createdMealTypes;
}

export async function initializeDefaultMealTypes(prisma: PrismaClient, actor: DomainActor) {
  requireAdmin(actor);
  return prisma.$transaction(async (tx) => {
    return initializeDefaultMealTypesInTransaction(tx, actor.businessId, actor.userId);
  });
}

type MenuMealInput = { mealTypeId: string; name: string; description?: string };

export async function saveMenu(
  prisma: PrismaClient,
  actor: DomainActor,
  input: { menuDate: Date; items: MenuMealInput[]; publish: boolean; idempotencyKey: string },
) {
  requireAdmin(actor);
  if (!input.items.length || input.items.some((item) => !item.name.trim())) throw new DomainError("Every menu meal needs a dish name.", "VALIDATION");
  if (new Set(input.items.map((item) => item.mealTypeId)).size !== input.items.length) throw new DomainError("A menu can contain each meal type only once.", "VALIDATION");
  const menuDate = dateOnly(input.menuDate);
  return prisma.$transaction(async (tx) => {
    const operation = await beginIdempotentOperation(tx, actor, "menu.save", input.idempotencyKey);
    if (operation.replay) return operation.replay as { menuId: string };
    const mealCount = await tx.mealType.count({ where: { businessId: actor.businessId, id: { in: input.items.map((item) => item.mealTypeId) }, status: "ACTIVE" } });
    if (mealCount !== input.items.length) throw new DomainError("Menu contains an invalid meal type.", "VALIDATION");
    const menu = await tx.menu.upsert({
      where: { businessId_menuDate: { businessId: actor.businessId, menuDate } },
      create: { businessId: actor.businessId, menuDate, status: input.publish ? MenuStatus.PUBLISHED : MenuStatus.DRAFT, publishedAt: input.publish ? new Date() : null },
      update: { status: input.publish ? MenuStatus.PUBLISHED : MenuStatus.DRAFT, publishedAt: input.publish ? new Date() : null },
    });
    for (const item of input.items) {
      await tx.menuItem.upsert({
        where: { menuId_mealTypeId: { menuId: menu.id, mealTypeId: item.mealTypeId } },
        create: { businessId: actor.businessId, menuId: menu.id, mealTypeId: item.mealTypeId, name: item.name.trim(), description: item.description?.trim() || null },
        update: { name: item.name.trim(), description: item.description?.trim() || null },
      });
    }
    await writeAudit(tx, actor, "menu", menu.id, input.publish ? "MENU_PUBLISHED" : "MENU_SAVED", { menuDate: menuDate.toISOString(), mealCount: input.items.length });
    const response = { menuId: menu.id };
    await completeIdempotentOperation(tx, actor, "menu.save", input.idempotencyKey, "menu", menu.id, response);
    return response;
  });
}

export async function unpublishMenu(prisma: PrismaClient, actor: DomainActor, menuId: string, idempotencyKey: string) {
  requireAdmin(actor);
  return prisma.$transaction(async (tx) => {
    const operation = await beginIdempotentOperation(tx, actor, "menu.unpublish", idempotencyKey);
    if (operation.replay) return operation.replay as { menuId: string };
    const menu = await tx.menu.findFirst({ where: { id: menuId, businessId: actor.businessId } });
    if (!menu) throw new DomainError("Menu was not found.", "NOT_FOUND");
    await tx.menu.update({ where: { id: menuId }, data: { status: MenuStatus.UNPUBLISHED, publishedAt: null } });
    await writeAudit(tx, actor, "menu", menuId, "MENU_UNPUBLISHED");
    const response = { menuId };
    await completeIdempotentOperation(tx, actor, "menu.unpublish", idempotencyKey, "menu", menuId, response);
    return response;
  });
}

export async function setFuturePrice(
  prisma: PrismaClient,
  actor: DomainActor,
  input: { mealTypeId: string; amountMinor: number; effectiveFrom: Date; effectiveTo?: Date; idempotencyKey: string },
) {
  requireAdmin(actor);
  if (!Number.isInteger(input.amountMinor) || input.amountMinor < 0) throw new DomainError("Price must be a non-negative whole paise amount.", "VALIDATION");
  if (input.effectiveTo && dateOnly(input.effectiveTo) < dateOnly(input.effectiveFrom)) throw new DomainError("Price end date cannot be before its start date.", "VALIDATION");
  return prisma.$transaction(async (tx) => {
    const operation = await beginIdempotentOperation(tx, actor, "price.set", input.idempotencyKey);
    if (operation.replay) return operation.replay as { priceId: string };
    const mealType = await tx.mealType.findFirst({ where: { id: input.mealTypeId, businessId: actor.businessId } });
    if (!mealType) throw new DomainError("Meal type was not found.", "NOT_FOUND");
    const overlapping = await tx.price.findMany({
      where: {
        businessId: actor.businessId,
        mealTypeId: mealType.id,
        AND: [
          { effectiveFrom: { lte: input.effectiveTo ? dateOnly(input.effectiveTo) : new Date("9999-12-31") } },
          { OR: [{ effectiveTo: null }, { effectiveTo: { gte: dateOnly(input.effectiveFrom) } }] },
        ],
      },
    });
    const effectiveFrom = dateOnly(input.effectiveFrom);
    const effectiveTo = input.effectiveTo ? dateOnly(input.effectiveTo) : null;
    for (const existing of overlapping) {
      const canCloseOpenEndedCurrent = existing.effectiveTo === null && existing.effectiveFrom < effectiveFrom;
      if (!canCloseOpenEndedCurrent) throw new DomainError("An active price already exists for this effective period.", "INVALID_STATE");
      const previousDay = new Date(effectiveFrom);
      previousDay.setUTCDate(previousDay.getUTCDate() - 1);
      await tx.price.update({ where: { id: existing.id }, data: { effectiveTo: previousDay } });
      await writeAudit(tx, actor, "price", existing.id, "PRICE_PERIOD_CLOSED", { effectiveTo: previousDay.toISOString() });
    }
    const price = await tx.price.create({ data: { businessId: actor.businessId, mealTypeId: mealType.id, amountMinor: input.amountMinor, effectiveFrom, effectiveTo } });
    await writeAudit(tx, actor, "price", price.id, "PRICE_CREATED", { mealTypeId: mealType.id, amountMinor: input.amountMinor, effectiveFrom: price.effectiveFrom.toISOString() });
    const response = { priceId: price.id };
    await completeIdempotentOperation(tx, actor, "price.set", input.idempotencyKey, "price", price.id, response);
    return response;
  });
}
