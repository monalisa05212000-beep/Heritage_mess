import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/authorization";
import { reactivateCustomerAccess } from "@/lib/domain/customers";
import { domainError, invalidInput } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { adminCustomerActionSchema } from "@/lib/validation/domain";

export async function POST(request: Request, context: { params: Promise<{ customerId: string }> }) {
  const limited = await enforceRateLimit(prisma, request, { scope: "admin.customers.write", limit: 30, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;
  const parsed = adminCustomerActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidInput(parsed.error);
  try {
    const principal = await requireAdmin();
    const { customerId } = await context.params;
    await reactivateCustomerAccess(prisma, { role: "ADMIN", businessId: principal.businessId, userId: principal.userId }, customerId, parsed.data.idempotencyKey);
    return NextResponse.json({ ok: true, customerId });
  } catch (error) {
    const mapped = domainError(error);
    if (mapped) return mapped;
    console.error("Customer reactivation failed", error);
    return NextResponse.json({ error: "Customer could not be reactivated." }, { status: 500 });
  }
}
