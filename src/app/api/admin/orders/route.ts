import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/authorization";
import { businessDateFromKey, businessDateKey } from "@/lib/domain/time";
import { domainError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { adminOrdersQuerySchema } from "@/lib/validation/domain";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = adminOrdersQuerySchema.safeParse({ date: url.searchParams.get("date") ?? undefined });
  if (!parsed.success) return NextResponse.json({ error: "Use a valid YYYY-MM-DD date." }, { status: 400 });

  try {
    const principal = await requireAdmin();
    const date = parsed.data.date ?? businessDateKey();
    const serviceDate = businessDateFromKey(date);
    const orders = await prisma.orderItem.findMany({
      where: { businessId: principal.businessId, serviceDate },
      orderBy: [{ mealType: { sortOrder: "asc" } }, { id: "desc" }],
      include: { customer: { select: { id: true, name: true, phone: true } }, mealType: true, charges: true },
    });
    return NextResponse.json({ ok: true, date, orders });
  } catch (error) {
    const mapped = domainError(error);
    if (mapped) return mapped;
    console.error("Admin order read failed", error);
    return NextResponse.json({ error: "Orders could not be loaded." }, { status: 500 });
  }
}
