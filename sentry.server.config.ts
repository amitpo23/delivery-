import * as Sentry from "@sentry/nextjs";

/**
 * Server (Node) Sentry. SENTRY_DSN preferred; falls back to NEXT_PUBLIC_
 * so a single key works for both surfaces.
 */
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  });
}
