import { NextResponse } from "next/server";

import { CUSTOMER_SESSION_COOKIE, invalidateCustomerSession } from "../../../../lib/auth/session";

export async function POST(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${CUSTOMER_SESSION_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");

  await invalidateCustomerSession(token);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CUSTOMER_SESSION_COOKIE, "", { httpOnly: true, path: "/", expires: new Date(0) });
  return response;
}
