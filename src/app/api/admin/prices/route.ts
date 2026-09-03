import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/authorization";
import { setFuturePrice } from "@/lib/domain/catalog";
import { businessDateFromKey } from "@/lib/domain/time";
import { domainError, invalidInput } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { adminSetPriceSchema } from "@/lib/validation/domain";

export async function GET() {
  try {
    const principal = await requireAdmin();
    const prices = await prisma.price.findMany({
      where: { businessId: principal.businessId },
      include: { mealType: { select: { id: true, code: true, name: true, sortOrder: true } } },
      orderBy: [{ mealType: { sortOrder: "asc" } }, { effectiveFrom: "desc" }],
    });

    return NextResponse.json({ ok: true, prices });
  } catch (error) {
    const mapped = domainError(error);
    if (mapped) return mapped;
    console.error("Admin prices read failed", error);
    return NextResponse.json({ error: "Prices could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const parsed = adminSetPriceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    const principal = await requireAdmin();
    const effectiveFrom = businessDateFromKey(parsed.data.effectiveFrom);
    const effectiveTo = parsed.data.effectiveTo ? businessDateFromKey(parsed.data.effectiveTo) : undefined;

    const result = await setFuturePrice(
      prisma,
      { role: "ADMIN", businessId: principal.businessId, userId: principal.userId },
      {
        mealTypeId: parsed.data.mealTypeId,
        amountMinor: parsed.data.amountMinor,
        effectiveFrom,
        effectiveTo,
        idempotencyKey: parsed.data.idempotencyKey,
      },
    );

    const price = await prisma.price.findFirst({
      where: { id: result.priceId, businessId: principal.businessId },
      include: { mealType: { select: { id: true, code: true, name: true, sortOrder: true } } },
    });

    return NextResponse.json({ ok: true, price }, { status: 201 });
  } catch (error) {
    const mapped = domainError(error);
    if (mapped) return mapped;
    console.error("Admin price save failed", error);
    return NextResponse.json({ error: "Price could not be saved." }, { status: 500 });
  }
}
