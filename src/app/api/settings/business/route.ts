import { NextResponse } from "next/server";

import { AuthorizationError, requireAdmin } from "@/lib/auth/authorization";
import { apiError, invalidInput } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { businessSettingsSchema } from "@/lib/validation/auth";

export async function PATCH(request: Request) {
  const limited = await enforceRateLimit(prisma, request, { scope: "admin.settings.write", limit: 30, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;

  const parsed = businessSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    const principal = await requireAdmin();
    const before = await prisma.business.findUnique({
      where: { id: principal.businessId },
      select: { name: true, phone: true, address: true },
    });
    if (!before) return apiError("Business settings could not be found.", 404);

    const business = await prisma.$transaction(async (tx) => {
      const updated = await tx.business.update({
        where: { id: principal.businessId },
        data: { ...parsed.data, address: parsed.data.address || null },
        select: { id: true, name: true, phone: true, address: true },
      });
      await tx.auditLog.create({
        data: {
          businessId: principal.businessId,
          actorUserId: principal.userId,
          entityType: "BUSINESS",
          entityId: principal.businessId,
          action: "BUSINESS_SETTINGS_UPDATED",
          beforeData: before,
          afterData: updated,
        },
      });
      return updated;
    });

    return NextResponse.json({ ok: true, business });
  } catch (error) {
    if (error instanceof AuthorizationError) return apiError(error.message, 401);
    console.error("Business settings update failed", error);
    return apiError("Business settings could not be saved. No changes were made.", 500);
  }
}
