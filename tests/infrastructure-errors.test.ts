import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { DomainError } from "../src/lib/domain/errors";
import { domainError } from "../src/lib/http";

describe("infrastructure error mapping", () => {
  it("maps a transient pool timeout to a retryable 503", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Timed out fetching a connection", { code: "P2024", clientVersion: "6.6.0" });
    const response = domainError(error);
    expect(response?.status).toBe(503);
    expect(response?.headers.get("Retry-After")).toBe("2");
  });

  it("maps an unreachable-database initialization error to 503", () => {
    const error = new Prisma.PrismaClientInitializationError("Can't reach database server", "6.6.0", "P1001");
    expect(domainError(error)?.status).toBe(503);
  });

  it("still returns null for genuinely unknown errors so they surface as 500", () => {
    expect(domainError(new Error("something else entirely"))).toBeNull();
    const unrelated = new Prisma.PrismaClientKnownRequestError("nope", { code: "P2002", clientVersion: "6.6.0" });
    expect(domainError(unrelated)).toBeNull();
  });

  it("keeps mapping domain rules to their own status codes", () => {
    expect(domainError(new DomainError("nope", "CONFLICT"))?.status).toBe(409);
  });
});
