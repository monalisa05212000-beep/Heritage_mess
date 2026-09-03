import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, createSessionToken, hashToken, requestMetadata, sessionCookieOptions, sessionExpiry } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { initializeDefaultMealTypesInTransaction } from "@/lib/domain/catalog";
import { apiError, invalidInput } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { initialSetupSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const parsed = initialSetupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidInput(parsed.error);

  const input = parsed.data;
  const passwordHash = await hashPassword(input.adminPassword);
  const token = createSessionToken();
  const expiresAt = sessionExpiry();
  const metadata = requestMetadata(request);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // This unique record is the one-time gate. A concurrent setup attempt rolls back.
        await tx.setupState.create({ data: { key: "initial-setup" } });

        const business = await tx.business.create({
          data: { name: input.businessName, phone: input.businessPhone },
        });
        const admin = await tx.user.create({
          data: {
            businessId: business.id,
            role: "ADMIN",
            name: input.adminName,
            email: input.adminEmail,
            passwordHash,
          },
        });

        await tx.businessSetting.createMany({
          data: [
            { businessId: business.id, settingKey: "timezone", settingValue: "Asia/Kolkata" },
            { businessId: business.id, settingKey: "invoice_format", settingValue: "INV-YYYY-0001" },
            { businessId: business.id, settingKey: "adjustment_format", settingValue: "ADJ-YYYY-0001" },
          ],
        });

        await initializeDefaultMealTypesInTransaction(tx, business.id, admin.id);

        await tx.adminSession.create({
          data: {
            userId: admin.id,
            tokenHash: hashToken(token),
            expiresAt,
            ipHash: metadata.ipHash,
            userAgent: metadata.userAgent,
          },
        });

        await tx.auditLog.create({
          data: {
            businessId: business.id,
            actorUserId: admin.id,
            entityType: "BUSINESS",
            entityId: business.id,
            action: "INITIAL_SETUP_COMPLETED",
            afterData: {
              businessName: business.name,
              adminName: admin.name,
              adminEmail: admin.email,
              timezone: "Asia/Kolkata",
            },
          },
        });

        return { businessName: business.name };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    const response = NextResponse.json({ ok: true, businessName: result.businessName }, { status: 201 });
    response.cookies.set(ADMIN_SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError("Initial setup has already been completed. Sign in with an admin account.", 409);
    }
    console.error("Initial setup failed", error);
    return apiError("Initial setup could not be completed. No business or account was created.", 500);
  }
}

