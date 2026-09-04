import { NextResponse } from "next/server";

import { getCustomerPrincipal } from "@/lib/auth/session";
import { cancelOrderItem } from "@/lib/domain/orders";
import { domainError, invalidInput } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { customerCancelOrderSchema } from "@/lib/validation/domain";

export async function POST(request: Request) {
  const limited = await enforceRateLimit(prisma, request, { scope: "customer.orders.write", limit: 30, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;

  const parsed = customerCancelOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    const principal = await getCustomerPrincipal();
    if (!principal) return NextResponse.json({ error: "Customer access is required." }, { status: 401 });
    const result = await cancelOrderItem(
      prisma,
      { role: "CUSTOMER", businessId: principal.businessId, customerId: principal.customerId },
      parsed.data.orderItemId,
      parsed.data.idempotencyKey,
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const mapped = domainError(error);
    if (mapped) return mapped;
    console.error("Customer order cancel failed", error);
    return NextResponse.json({ error: "Order could not be cancelled." }, { status: 500 });
  }
}
