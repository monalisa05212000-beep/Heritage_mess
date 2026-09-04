import { AccountStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { createAdminSession, ADMIN_SESSION_COOKIE, requestMetadata, sessionCookieOptions } from "@/lib/auth/session";
import { hasExceededLoginLimit, recordLoginAttempt } from "@/lib/auth/login-rate-limit";
import { verifyPassword } from "@/lib/auth/password";
import { apiError, invalidInput } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { loginSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const limited = await enforceRateLimit(prisma, request, { scope: "auth.login", limit: 30, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidInput(parsed.error);

  const { email, password } = parsed.data;
  const metadata = requestMetadata(request);

  if (await hasExceededLoginLimit(email)) {
    return apiError("Too many sign-in attempts. Please wait before trying again.", 429);
  }

  const admin = await prisma.user.findFirst({
    where: { email, role: UserRole.ADMIN, status: AccountStatus.ACTIVE },
    select: { id: true, passwordHash: true },
  });
  if (!admin?.passwordHash) {
    await recordLoginAttempt(email, metadata.ipHash, false);
    return apiError("Email or password is incorrect.", 401);
  }

  const authenticated = await verifyPassword(admin.passwordHash, password);
  if (!authenticated) {
    await recordLoginAttempt(email, metadata.ipHash, false);
    return apiError("Email or password is incorrect.", 401);
  }

  await recordLoginAttempt(email, metadata.ipHash, true);
  const session = await createAdminSession(admin.id, metadata);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
  return response;
}
