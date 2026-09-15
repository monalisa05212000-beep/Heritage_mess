import { securityConfig } from "@/lib/env";
import { prisma } from "@/lib/prisma";

// Returned unexecuted so callers can batch it with other reads: on a pooled
// connection each separate query costs a full round trip.
export function countRecentFailedLogins(email: string) {
  const since = new Date(Date.now() - securityConfig.loginWindowMinutes * 60 * 1000);
  return prisma.loginAttempt.count({
    where: { email, succeeded: false, occurredAt: { gte: since } },
  });
}

export function hasExceededFailedLogins(failedAttempts: number) {
  return failedAttempts >= securityConfig.loginMaxAttempts;
}

export async function hasExceededLoginLimit(email: string) {
  return hasExceededFailedLogins(await countRecentFailedLogins(email));
}

export function recordLoginAttempt(email: string, ipHash: string | null, succeeded: boolean) {
  return prisma.loginAttempt.create({ data: { email, ipHash, succeeded } });
}

