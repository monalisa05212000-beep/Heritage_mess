function positiveInteger(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

export const securityConfig = {
  sessionTtlHours: positiveInteger("SESSION_TTL_HOURS", 12),
  loginMaxAttempts: positiveInteger("LOGIN_MAX_ATTEMPTS", 5),
  loginWindowMinutes: positiveInteger("LOGIN_WINDOW_MINUTES", 15),
} as const;

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim());
}
