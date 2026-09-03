import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/authorization";
import { saveMenu } from "@/lib/domain/catalog";
import { businessDateFromKey, businessDateKey } from "@/lib/domain/time";
import { domainError, invalidInput } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { adminSaveMenuSchema } from "@/lib/validation/domain";

export async function GET(request: Request) {
  try {
    const principal = await requireAdmin();
    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? businessDateKey();
    const menuDate = businessDateFromKey(date);
    const [mealTypes, menu] = await Promise.all([
      prisma.mealType.findMany({
        where: { businessId: principal.businessId, status: "ACTIVE" },
        orderBy: { sortOrder: "asc" },
        select: { id: true, code: true, name: true, orderingCutoffMinutes: true, cancellationCutoffMinutes: true },
      }),
      prisma.menu.findUnique({
        where: { businessId_menuDate: { businessId: principal.businessId, menuDate } },
        include: { items: { include: { mealType: true }, orderBy: { mealType: { sortOrder: "asc" } } } },
      }),
    ]);

    return NextResponse.json({ ok: true, date, mealTypes, menu });
  } catch (error) {
    const mapped = domainError(error);
    if (mapped) return mapped;
    console.error("Admin menu read failed", error);
    return NextResponse.json({ error: "Menu could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const parsed = adminSaveMenuSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    const principal = await requireAdmin();
    const result = await saveMenu(prisma, { role: "ADMIN", businessId: principal.businessId, userId: principal.userId }, {
      menuDate: businessDateFromKey(parsed.data.menuDate),
      items: parsed.data.items,
      publish: parsed.data.publish,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    const menu = await prisma.menu.findFirst({
      where: { id: result.menuId, businessId: principal.businessId },
      include: { items: { include: { mealType: true }, orderBy: { mealType: { sortOrder: "asc" } } } },
    });
    return NextResponse.json({ ok: true, menu }, { status: parsed.data.publish ? 201 : 200 });
  } catch (error) {
    const mapped = domainError(error);
    if (mapped) return mapped;
    console.error("Admin menu save failed", error);
    return NextResponse.json({ error: "Menu could not be saved." }, { status: 500 });
  }
}
