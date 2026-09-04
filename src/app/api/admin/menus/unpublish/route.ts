import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/authorization";
import { unpublishMenu } from "@/lib/domain/catalog";
import { domainError, invalidInput } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { adminUnpublishMenuSchema } from "@/lib/validation/domain";

export async function POST(request: Request) {
  const limited = await enforceRateLimit(prisma, request, { scope: "admin.menus.write", limit: 30, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;

  const parsed = adminUnpublishMenuSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    const principal = await requireAdmin();
    const result = await unpublishMenu(
      prisma,
      { role: "ADMIN", businessId: principal.businessId, userId: principal.userId },
      parsed.data.menuId,
      parsed.data.idempotencyKey,
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const mapped = domainError(error);
    if (mapped) return mapped;
    console.error("Admin menu unpublish failed", error);
    return NextResponse.json({ error: "Menu could not be unpublished." }, { status: 500 });
  }
}
