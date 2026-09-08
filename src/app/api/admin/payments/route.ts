import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/authorization";
import { recordPayment } from "@/lib/domain/finance";
import { businessDateFromKey } from "@/lib/domain/time";
import { domainError, invalidInput } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { adminRecordPaymentSchema } from "@/lib/validation/domain";

export async function POST(request: Request) {
  const limited = await enforceRateLimit(prisma, request, { scope: "admin.payments.write", limit: 60, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;
  const parsed = adminRecordPaymentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidInput(parsed.error);
  try {
    const principal = await requireAdmin();
    const result = await recordPayment(prisma, { role: "ADMIN", businessId: principal.businessId, userId: principal.userId }, {
      ...parsed.data,
      paymentDate: businessDateFromKey(parsed.data.paymentDate),
      reference: parsed.data.reference || undefined,
      note: parsed.data.note || undefined,
    });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    const mapped = domainError(error);
    if (mapped) return mapped;
    console.error("Payment record failed", error);
    return NextResponse.json({ error: "Payment could not be recorded." }, { status: 500 });
  }
}
