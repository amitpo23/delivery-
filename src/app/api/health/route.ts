import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Public health probe for UptimeRobot / BetterStack / status pages.
 * Returns 200 when both the runtime and the DB are reachable, 503 if
 * the DB query fails. The probe runs a trivial `count` so it doesn't
 * burn DB time on cold start.
 *
 * Returns no sensitive details — just a status surface and the deploy
 * commit (if Vercel exposed VERCEL_GIT_COMMIT_SHA).
 */
export async function GET() {
  const startedAt = Date.now();
  let dbOk = false;
  let dbLatencyMs: number | null = null;
  let dbError: string | null = null;

  try {
    const t0 = Date.now();
    const admin = createAdminClient();
    const { error } = await admin.from("orders").select("id", { count: "exact", head: true }).limit(1);
    dbLatencyMs = Date.now() - t0;
    if (error) {
      dbError = error.message;
    } else {
      dbOk = true;
    }
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  const ok = dbOk;
  return NextResponse.json(
    {
      ok,
      uptime_ms: Date.now() - startedAt,
      db: { ok: dbOk, latency_ms: dbLatencyMs, error: dbError },
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
