import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, invalidateAdminSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${ADMIN_SESSION_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");

  await invalidateAdminSession(token);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", { httpOnly: true, path: "/", expires: new Date(0) });
  return response;
}

