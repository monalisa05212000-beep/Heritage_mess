import { MenuStatus, PrismaClient } from "@prisma/client";

import type { DomainActor } from "@/lib/domain/context";
import { requireAdmin, writeAudit } from "@/lib/domain/context";
import { DomainError } from "@/lib/domain/errors";
import { beginIdempotentOperation, completeIdempotentOperation } from "@/lib/domain/idempotency";
import { dateOnly } from "@/lib/domain/time";

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
    const price = await tx.price.create({ data: { businessId: actor.businessId, mealTypeId: mealType.id, amountMinor: input.amountMinor, effectiveFrom: dateOnly(input.effectiveFrom), effectiveTo: input.effectiveTo ? dateOnly(input.effectiveTo) : null } });
    await writeAudit(tx, actor, "price", price.id, "PRICE_CREATED", { mealTypeId: mealType.id, amountMinor: input.amountMinor, effectiveFrom: price.effectiveFrom.toISOString() });
    const response = { priceId: price.id };
    await completeIdempotentOperation(tx, actor, "price.set", input.idempotencyKey, "price", price.id, response);
    return response;
  });
}
