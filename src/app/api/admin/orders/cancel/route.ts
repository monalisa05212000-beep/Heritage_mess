import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/authorization";
import { cancelOrderItem } from "@/lib/domain/orders";
import { domainError, invalidInput } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { customerCancelOrderSchema } from "@/lib/validation/domain"; // same shape as customer payload

export async function POST(request: Request) {
  const limited = await enforceRateLimit(prisma, request, { scope: "admin.orders.write", limit: 60, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;

  const parsed = customerCancelOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    const principal = await requireAdmin();
    const result = await cancelOrderItem(
      prisma,
      { role: "ADMIN", businessId: principal.businessId, userId: principal.userId },
      parsed.data.orderItemId,
      parsed.data.idempotencyKey,
    );
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (error) {
    const mapped = domainError(error);
    if (mapped) return mapped;
    console.error("Admin order cancel failed", error);
    return NextResponse.json({ error: "Order could not be cancelled." }, { status: 500 });
  }
}
