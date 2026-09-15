import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Logged once per cold start, to the server log only. The hostname, port and
// the presence of pooling parameters determine whether queries are crossing a
// region boundary; no credentials are read or emitted.
function logConnectionShape() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return;
  try {
    const url = new URL(raw);
    console.error("db connection shape", {
      host: url.hostname,
      port: url.port,
      pgbouncer: url.searchParams.get("pgbouncer"),
      connectionLimit: url.searchParams.get("connection_limit"),
      region: process.env.VERCEL_REGION ?? "unknown",
    });
  } catch {
    console.error("db connection shape: DATABASE_URL is not parseable as a URL");
  }
}

logConnectionShape();

// Liveness probe for uptime monitoring. Two queries, no parameters, no
// business data: the first covers connection setup, the second is the
// steady-state cost. Deliberately not rate-limited so a monitor can poll it,
// which is also why it must stay this cheap.
export async function GET() {
  const startedAt = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const firstQueryMs = Math.round(performance.now() - startedAt);

    const warmStartedAt = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    const warmQueryMs = Math.round(performance.now() - warmStartedAt);

    return NextResponse.json(
      { ok: true, region: process.env.VERCEL_REGION ?? "unknown", firstQueryMs, warmQueryMs },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Health check failed", error);
    return NextResponse.json(
      { ok: false, region: process.env.VERCEL_REGION ?? "unknown", elapsedMs: Math.round(performance.now() - startedAt) },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "5" } },
    );
  }
}
