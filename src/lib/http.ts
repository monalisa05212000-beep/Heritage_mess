import { NextResponse } from "next/server";
import { ZodError } from "zod";

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

