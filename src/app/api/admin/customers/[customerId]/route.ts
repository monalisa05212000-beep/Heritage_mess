import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/authorization";
import { updateCustomerProfile } from "@/lib/domain/customers";
import { domainError, invalidInput } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { adminUpdateCustomerSchema } from "@/lib/validation/domain";

export async function PATCH(request: Request, context: { params: Promise<{ customerId: string }> }) {
  const limited = await enforceRateLimit(prisma, request, { scope: "admin.customers.write", limit: 60, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;
  const parsed = adminUpdateCustomerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    const principal = await requireAdmin();
    const { customerId } = await context.params;
    await updateCustomerProfile(prisma, { role: "ADMIN", businessId: principal.businessId, userId: principal.userId }, { customerId, ...parsed.data });
    const customer = await prisma.customer.findFirst({ where: { id: customerId, businessId: principal.businessId }, select: { id: true, name: true, phone: true, status: true, payAsYouGoEnabled: true } });
    return NextResponse.json({ ok: true, customer });
  } catch (error) {
    const mapped = domainError(error);
    if (mapped) return mapped;
    console.error("Admin customer update failed", error);
    return NextResponse.json({ error: "Customer could not be updated." }, { status: 500 });
  }
}
