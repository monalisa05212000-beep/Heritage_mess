import { securityConfig } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export async function hasExceededLoginLimit(email: string) {
  const since = new Date(Date.now() - securityConfig.loginWindowMinutes * 60 * 1000);
  const attempts = await prisma.loginAttempt.count({
    where: { email, succeeded: false, occurredAt: { gte: since } },
  });
  return attempts >= securityConfig.loginMaxAttempts;
}

export function recordLoginAttempt(email: string, ipHash: string | null, succeeded: boolean) {
  return prisma.loginAttempt.create({ data: { email, ipHash, succeeded } });
}

