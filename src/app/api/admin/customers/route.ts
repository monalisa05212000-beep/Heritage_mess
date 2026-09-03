import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/authorization";
import { createCustomer } from "@/lib/domain/customers";
import { domainError, invalidInput } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { adminCreateCustomerSchema } from "@/lib/validation/domain";

export async function GET() {
  try {
    const principal = await requireAdmin();
    const customers = await prisma.customer.findMany({
      where: { businessId: principal.businessId },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        payAsYouGoEnabled: true,
        createdAt: true,
        _count: { select: { orderItems: true, subscriptions: true } },
      },
    });
    return NextResponse.json({ ok: true, customers });
  } catch (error) {
    const mapped = domainError(error);
    if (mapped) return mapped;
    console.error("Admin customer read failed", error);
    return NextResponse.json({ error: "Customers could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const parsed = adminCreateCustomerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    const principal = await requireAdmin();
    const result = await createCustomer(prisma, { role: "ADMIN", businessId: principal.businessId, userId: principal.userId }, parsed.data);
    const customer = await prisma.customer.findFirst({
      where: { id: result.customerId, businessId: principal.businessId },
      select: { id: true, name: true, phone: true, status: true, payAsYouGoEnabled: true },
    });
    return NextResponse.json({ ok: true, customer, existing: result.existing }, { status: result.existing ? 200 : 201 });
  } catch (error) {
    const mapped = domainError(error);
    if (mapped) return mapped;
    console.error("Admin customer create failed", error);
    return NextResponse.json({ error: "Customer could not be saved." }, { status: 500 });
  }
}
