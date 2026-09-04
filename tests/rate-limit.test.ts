import { describe, expect, it, vi } from "vitest";

import { consumeRateLimit } from "../src/lib/security/rate-limit";

function requestFrom(ip: string) {
  return new Request("http://localhost/api/test", {
    headers: { "x-forwarded-for": ip },
  });
}

describe("persistent request rate limiting", () => {
  it("records an allowed request against the hashed client address", async () => {
    const prisma = {
      rateLimitEvent: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({}),
      },
    };

    const result = await consumeRateLimit(prisma as never, requestFrom("203.0.113.10"), {
      scope: "customer.access",
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    expect(result.allowed).toBe(true);
    expect(prisma.rateLimitEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ scope: "customer.access", keyHash: expect.any(String) }),
    }));
  });

  it("does not record requests after the bucket limit is reached", async () => {
    const prisma = {
      rateLimitEvent: {
        count: vi.fn().mockResolvedValue(10),
        create: vi.fn(),
      },
    };

    const result = await consumeRateLimit(prisma as never, requestFrom("203.0.113.10"), {
      scope: "customer.access",
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(900);
    expect(prisma.rateLimitEvent.create).not.toHaveBeenCalled();
  });
});
