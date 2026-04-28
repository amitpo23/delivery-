/**
 * Next.js calls this once per runtime (node + edge) on cold start.
 * Importing the matching Sentry config there is the canonical wiring
 * since Next 15 — it replaces sentry.server.config.ts auto-loading.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

import * as Sentry from "@sentry/nextjs";

// Re-emit unhandled request errors into Sentry. Next 16 calls this hook
// for every server-side error from the App Router pipeline.
export function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
  errorContext: { routerKind: string; routePath: string; routeType: string },
): void {
  Sentry.captureException(err, { extra: { request, ...errorContext } });
}
