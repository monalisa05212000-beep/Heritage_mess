import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@prisma/client";

import { consumeRateLimit } from "../src/lib/security/rate-limit";

function prismaSpy(existingInWindow = 0) {
  const count = vi.fn().mockResolvedValue(existingInWindow);
  const create = vi.fn().mockResolvedValue({});
  const client = { rateLimitEvent: { count, create } } as unknown as PrismaClient;
  return { client, count, create };
}

const requestFrom = (ip: string) => new Request("http://localhost/api/x", { method: "POST", headers: { "x-forwarded-for": ip } });
const config = { scope: "customer.orders.write", limit: 20, windowMs: 60_000 };

describe("rate-limit keying", () => {
  it("gives two customers behind one shared address separate windows", async () => {
    const { client, count } = prismaSpy();

    await consumeRateLimit(client, requestFrom("203.0.113.9"), { ...config, identity: "customer-1" });
    await consumeRateLimit(client, requestFrom("203.0.113.9"), { ...config, identity: "customer-2" });

    const [first, second] = count.mock.calls.map((call) => call[0].where.keyHash);
    expect(first).not.toBe(second);
  });

  it("gives one customer the same window from two different addresses", async () => {
    const { client, count } = prismaSpy();

    await consumeRateLimit(client, requestFrom("203.0.113.9"), { ...config, identity: "customer-1" });
    await consumeRateLimit(client, requestFrom("198.51.100.4"), { ...config, identity: "customer-1" });

    const [first, second] = count.mock.calls.map((call) => call[0].where.keyHash);
    expect(first).toBe(second);
  });

  it("still falls back to the client address when there is no identity", async () => {
    const { client, count } = prismaSpy();

    await consumeRateLimit(client, requestFrom("203.0.113.9"), config);
    await consumeRateLimit(client, requestFrom("198.51.100.4"), config);

    const [first, second] = count.mock.calls.map((call) => call[0].where.keyHash);
    expect(first).not.toBe(second);
  });

  it("counts and records against the same key", async () => {
    const { client, count, create } = prismaSpy();

    await consumeRateLimit(client, requestFrom("203.0.113.9"), { ...config, identity: "customer-1" });

    expect(create.mock.calls[0][0].data.keyHash).toBe(count.mock.calls[0][0].where.keyHash);
  });

  it("refuses once the window is full", async () => {
    const { client, create } = prismaSpy(20);

    const result = await consumeRateLimit(client, requestFrom("203.0.113.9"), { ...config, identity: "customer-1" });

    expect(result.allowed).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });
});
