import { AccountStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { CUSTOMER_SESSION_COOKIE, createSessionToken, hashToken, sessionCookieOptions, sessionExpiry } from "@/lib/auth/session";
import { apiError, invalidInput } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { customerAccessSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const limited = await enforceRateLimit(prisma, request, { scope: "customer.access", limit: 10, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;

  const parsed = customerAccessSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidInput(parsed.error);

  // MVP has one deployed caterer. A later multi-business entry URL will supply this scope.
  const businesses = await prisma.business.findMany({ select: { id: true }, take: 2 });
  if (businesses.length !== 1) {
    return apiError("Customer access must be opened from a business-specific link.", 409);
  }
  const customer = await prisma.customer.findFirst({ where: { businessId: businesses[0].id, name: parsed.data.name, phone: parsed.data.phone, status: AccountStatus.ACTIVE }, select: { id: true } });
  if (!customer) return apiError("We could not find an active customer with those details.", 401);
  const token = createSessionToken();
  const expiresAt = sessionExpiry();
  await prisma.customerSession.create({ data: { customerId: customer.id, tokenHash: hashToken(token), expiresAt } });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(CUSTOMER_SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return response;
}
