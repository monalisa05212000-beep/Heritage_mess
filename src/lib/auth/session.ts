import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { AccountStatus, UserRole } from "@prisma/client";

import { securityConfig } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import type { AdminPrincipal, CustomerPrincipal } from "@/lib/auth/policy";

export const ADMIN_SESSION_COOKIE = "heritage_admin_session";
export const CUSTOMER_SESSION_COOKIE = "heritage_customer_session";

export type SessionMetadata = {
  ipHash: string | null;
  userAgent: string | null;
};

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashIdentifier(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function sessionExpiry() {
  return new Date(Date.now() + securityConfig.sessionTtlHours * 60 * 60 * 1000);
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

export async function createAdminSession(userId: string, metadata: SessionMetadata) {
  const token = createSessionToken();
  const expiresAt = sessionExpiry();

  await prisma.adminSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      ipHash: metadata.ipHash,
      userAgent: metadata.userAgent,
    },
  });

  return { token, expiresAt };
}

export async function getAdminPrincipal(): Promise<AdminPrincipal | null> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.adminSession.findFirst({
    where: {
      tokenHash: hashToken(token),
      expiresAt: { gt: new Date() },
      invalidatedAt: null,
      user: { role: UserRole.ADMIN, status: AccountStatus.ACTIVE },
    },
    select: {
      userId: true,
      user: { select: { businessId: true } },
    },
  });

  if (!session) return null;
  return { kind: "admin", userId: session.userId, businessId: session.user.businessId };
}

export async function getCustomerPrincipal(): Promise<CustomerPrincipal | null> {
  const token = (await cookies()).get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.customerSession.findFirst({
    where: {
      tokenHash: hashToken(token),
      expiresAt: { gt: new Date() },
      invalidatedAt: null,
      customer: { status: AccountStatus.ACTIVE },
    },
    select: { customerId: true, customer: { select: { businessId: true } } },
  });

  if (!session) return null;
  return {
    kind: "customer",
    customerId: session.customerId,
    businessId: session.customer.businessId,
  };
}

export async function invalidateAdminSession(token: string | undefined) {
  if (!token) return;
  await prisma.adminSession.updateMany({
    where: { tokenHash: hashToken(token), invalidatedAt: null },
    data: { invalidatedAt: new Date() },
  });
}

export function requestMetadata(request: Request): SessionMetadata {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip");
  return {
    ipHash: ip ? hashIdentifier(ip) : null,
    userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
  };
}

