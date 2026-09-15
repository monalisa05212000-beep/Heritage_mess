import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Liveness probe. Reports the compute region and the measured database round
// trip so latency can be attributed to network, database or application.
// `?diag=1` adds a breakdown that distinguishes per-query fixed overhead from
// connection setup and shows whether batching helps. Exposes no connection
// details, no schema and no business data.
export async function GET(request: Request) {
  const startedAt = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const firstQueryMs = Math.round(performance.now() - startedAt);

    const warmStartedAt = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    const warmQueryMs = Math.round(performance.now() - warmStartedAt);

    const body: Record<string, unknown> = {
      ok: true,
      region: process.env.VERCEL_REGION ?? "unknown",
      firstQueryMs,
      warmQueryMs,
    };

    if (new URL(request.url).searchParams.get("diag") === "1") {
      const sequentialStartedAt = performance.now();
      for (let index = 0; index < 5; index += 1) await prisma.$queryRaw`SELECT 1`;
      const fiveSequentialMs = Math.round(performance.now() - sequentialStartedAt);

      const batchedStartedAt = performance.now();
      await prisma.$transaction([
        prisma.$queryRaw`SELECT 1`,
        prisma.$queryRaw`SELECT 1`,
        prisma.$queryRaw`SELECT 1`,
        prisma.$queryRaw`SELECT 1`,
        prisma.$queryRaw`SELECT 1`,
      ]);
      const fiveBatchedMs = Math.round(performance.now() - batchedStartedAt);

      const parallelStartedAt = performance.now();
      await Promise.all([
        prisma.$queryRaw`SELECT 1`,
        prisma.$queryRaw`SELECT 1`,
        prisma.$queryRaw`SELECT 1`,
        prisma.$queryRaw`SELECT 1`,
        prisma.$queryRaw`SELECT 1`,
      ]);
      const fiveParallelMs = Math.round(performance.now() - parallelStartedAt);

      body.diag = { fiveSequentialMs, fiveBatchedMs, fiveParallelMs };
    }

    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Health check failed", error);
    return NextResponse.json(
      { ok: false, region: process.env.VERCEL_REGION ?? "unknown", elapsedMs: Math.round(performance.now() - startedAt) },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "5" } },
    );
  }
}
