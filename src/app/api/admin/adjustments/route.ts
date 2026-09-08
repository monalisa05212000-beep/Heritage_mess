import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/authorization";
import { recordAdjustment } from "@/lib/domain/finance";
import { domainError, invalidInput } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { adminRecordAdjustmentSchema } from "@/lib/validation/domain";

export async function POST(request: Request) {
  const limited = await enforceRateLimit(prisma, request, { scope: "admin.adjustments.write", limit: 30, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;
  const parsed = adminRecordAdjustmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidInput(parsed.error);
  try {
    const principal = await requireAdmin();
    const result = await recordAdjustment(prisma, { role: "ADMIN", businessId: principal.businessId, userId: principal.userId }, parsed.data);
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    const mapped = domainError(error);
    if (mapped) return mapped;
    console.error("Adjustment record failed", error);
    return NextResponse.json({ error: "Adjustment could not be recorded." }, { status: 500 });
  }
}
