import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthorizationError } from "@/lib/auth/authorization";
import { DomainError } from "@/lib/domain/errors";

export function invalidInput(error: ZodError) {
  return NextResponse.json(
    {
      error: "Please review the highlighted details and try again.",
      fieldErrors: error.flatten().fieldErrors,
    },
    { status: 400 },
  );
}

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// Infrastructure failures that are transient and left no write behind, so the
// caller can safely retry: pool timeout, transaction timeout, write conflict,
// too many connections, and the two "cannot reach the database" codes.
const RETRYABLE_PRISMA_CODES = new Set(["P2024", "P2028", "P2034", "P2037", "P1001", "P1002"]);

export function domainError(error: unknown) {
  if (error instanceof AuthorizationError) return apiError(error.message, 401);
  if (!(error instanceof DomainError)) {
    const code =
      error instanceof Prisma.PrismaClientKnownRequestError ? error.code :
      error instanceof Prisma.PrismaClientInitializationError ? error.errorCode :
      undefined;
    if (!code || !RETRYABLE_PRISMA_CODES.has(code)) return null;
    console.error("Database infrastructure error", code, error);
    return NextResponse.json(
      { error: "The kitchen system is busy. Nothing was saved — please try again." },
      { status: 503, headers: { "Retry-After": "2" } },
    );
  }

  const statusByCode: Record<DomainError["code"], number> = {
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    VALIDATION: 400,
    CUTOFF_PASSED: 409,
    INSUFFICIENT_CAPACITY: 409,
    INVALID_STATE: 409,
  };

  return apiError(error.message, statusByCode[error.code]);
}
