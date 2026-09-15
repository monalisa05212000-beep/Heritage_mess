import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Liveness/readiness probe. Reports the compute region and the measured
// database round trip so latency problems can be attributed to the network,
// the database, or the application without guessing. Exposes no connection
// details, no schema and no business data.
export async function GET() {
  const startedAt = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const firstQueryMs = Math.round(performance.now() - startedAt);

    // A second query on the established connection separates connection setup
    // cost from steady-state query cost.
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
