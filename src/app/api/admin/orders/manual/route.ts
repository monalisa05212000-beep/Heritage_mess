import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/authorization";
import { createOrder } from "@/lib/domain/orders";
import { businessDateFromKey } from "@/lib/domain/time";
import { domainError, invalidInput } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { adminCreateOrderSchema } from "@/lib/validation/domain";

export async function POST(request: Request) {
  const limited = await enforceRateLimit(prisma, request, { scope: "admin.orders.write", limit: 60, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;
  const parsed = adminCreateOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidInput(parsed.error);
  try {
    const principal = await requireAdmin();
    const result = await createOrder(prisma, { role: "ADMIN", businessId: principal.businessId, userId: principal.userId }, {
      ...parsed.data,
      serviceDate: businessDateFromKey(parsed.data.serviceDate),
    });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    const mapped = domainError(error);
    if (mapped) return mapped;
    console.error("Manual order create failed", error);
    return NextResponse.json({ error: "Order could not be created." }, { status: 500 });
  }
}
