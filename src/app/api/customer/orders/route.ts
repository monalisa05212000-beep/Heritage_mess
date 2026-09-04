import { NextResponse } from "next/server";

import { getCustomerPrincipal } from "@/lib/auth/session";
import { createOrder } from "@/lib/domain/orders";
import { businessDateFromKey } from "@/lib/domain/time";
import { domainError, invalidInput } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { customerCreateOrderSchema } from "@/lib/validation/domain";

export async function GET() {
  const principal = await getCustomerPrincipal();
  if (!principal) return NextResponse.json({ error: "Customer access is required." }, { status: 401 });

  const orders = await prisma.orderItem.findMany({
    where: { businessId: principal.businessId, customerId: principal.customerId },
    orderBy: [{ serviceDate: "desc" }, { id: "desc" }],
    take: 30,
    include: { mealType: true },
  });
  return NextResponse.json({ ok: true, orders });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(prisma, request, { scope: "customer.orders.write", limit: 20, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;

  const parsed = customerCreateOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    const principal = await getCustomerPrincipal();
    if (!principal) return NextResponse.json({ error: "Customer access is required." }, { status: 401 });
    const result = await createOrder(prisma, {
      role: "CUSTOMER",
      businessId: principal.businessId,
      customerId: principal.customerId,
    }, {
      customerId: principal.customerId,
      serviceDate: businessDateFromKey(parsed.data.serviceDate),
      mealTypeId: parsed.data.mealTypeId,
      quantity: parsed.data.quantity,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    const mapped = domainError(error);
    if (mapped) return mapped;
    console.error("Customer order create failed", error);
    return NextResponse.json({ error: "Order could not be placed." }, { status: 500 });
  }
}
