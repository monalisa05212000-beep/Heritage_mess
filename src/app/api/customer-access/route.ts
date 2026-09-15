import { AccountStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { CUSTOMER_SESSION_COOKIE, createSessionToken, hashToken, sessionCookieOptions, sessionExpiry } from "@/lib/auth/session";
import { apiError, invalidInput } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { customerAccessSchema } from "@/lib/validation/auth";

/** Case and inner spacing are how people type, not part of the credential. */
const normalizeName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

export async function POST(request: Request) {
  // Generous, network-level flood guard. A mess or hostel shares one WiFi address,
  // so keeping the tight limit on the IP would have meant ten sign-ins per quarter
  // hour for the entire building.
  const flooded = await enforceRateLimit(prisma, request, { scope: "customer.access.ip", limit: 200, windowMs: 15 * 60 * 1000 });
  if (flooded) return flooded;

  const parsed = customerAccessSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidInput(parsed.error);

  const digits = parsed.data.phone.replace(/\D/g, "");
  // The brute-force guard belongs on the credential being guessed, not the network.
  const limited = await enforceRateLimit(prisma, request, { scope: "customer.access", limit: 10, windowMs: 15 * 60 * 1000, identity: `phone:${digits}` });
  if (limited) return limited;

  // MVP has one deployed caterer. A later multi-business entry URL will supply this scope.
  const businesses = await prisma.business.findMany({ select: { id: true }, take: 2 });
  if (businesses.length !== 1) {
    return apiError("Customer access must be opened from a business-specific link.", 409);
  }
  // Customers type their own details, so match them the way a person writes them.
  // The phone narrows in SQL by its last 10 digits, so "9000000001", "90000 00001",
  // "09000000001" and "+91 9000000001" all reach the same record whatever format the
  // admin entered. normalizedPhone is unique per business, so this is ~1 row.
  // ponytail: a suffix match can't use the normalized_phone index — fine at mess
  // scale; switch to an `in` list of candidate forms if the table ever gets large.
  const noMatch = () => apiError("We could not find an active customer with those details. Check your name and phone number, or ask the mess to add you.", 401);
  if (!digits) return noMatch();
  const candidates = await prisma.customer.findMany({
    where: {
      businessId: businesses[0].id,
      normalizedPhone: digits.length >= 10 ? { endsWith: digits.slice(-10) } : { equals: digits },
      status: AccountStatus.ACTIVE,
    },
    select: { id: true, name: true },
    take: 10,
  });
  // The name is compared here rather than in SQL on purpose. Prisma's
  // `mode: "insensitive"` compiles to an unescaped ILIKE, so a name of "%%" would
  // match every customer and reduce this two-factor sign-in to the phone alone.
  const matches = candidates.filter((candidate) => normalizeName(candidate.name) === normalizeName(parsed.data.name));
  // Require exactly one: details that somehow reach two records must never sign anyone in.
  if (matches.length !== 1) return noMatch();
  const customer = matches[0];
  const token = createSessionToken();
  const expiresAt = sessionExpiry();
  await prisma.customerSession.create({ data: { customerId: customer.id, tokenHash: hashToken(token), expiresAt } });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(CUSTOMER_SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return response;
}
