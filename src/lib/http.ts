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

export function domainError(error: unknown) {
  if (error instanceof AuthorizationError) return apiError(error.message, 401);
  if (!(error instanceof DomainError)) return null;

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
