import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

type RateLimitConfig = {
  scope: string;
  limit: number;
  windowMs: number;
  /**
   * Count this window against a caller identity (a customer id, a phone number)
   * instead of the client IP. A mess or hostel shares one WiFi address, so an
   * IP-keyed limit is really a limit on the whole building: one hungry customer
   * retrying would lock everybody else out of ordering. Leave unset for
   * genuinely anonymous traffic, where the IP is all there is.
   */
  identity?: string;
};

export async function consumeRateLimit(
  prisma: PrismaClient,
  request: Request,
  config: RateLimitConfig,
) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "missing-client-address";
  const key = config.identity ? `id:${config.identity}` : `ip:${ip}`;
  const keyHash = createHash("sha256").update(key).digest("hex");
  const count = await prisma.rateLimitEvent.count({
    where: {
      scope: config.scope,
      keyHash,
      occurredAt: { gte: windowStart },
    },
  });

  if (count >= config.limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(config.windowMs / 1000)) };
  }

  await prisma.rateLimitEvent.create({
    data: { scope: config.scope, keyHash, occurredAt: now },
  });

  return { allowed: true, retryAfterSeconds: 0 };
}

export async function enforceRateLimit(
  prisma: PrismaClient,
  request: Request,
  config: RateLimitConfig,
) {
  try {
    const result = await consumeRateLimit(prisma, request, config);
    if (result.allowed) return null;

    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
    );
  } catch (error) {
    console.error("Rate-limit storage check failed", error);
    return NextResponse.json(
      { error: "This request could not be processed right now. Please try again later." },
      { status: 503 },
    );
  }
}
