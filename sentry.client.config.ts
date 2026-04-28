import * as Sentry from "@sentry/nextjs";

/**
 * Browser Sentry. Initialised only when NEXT_PUBLIC_SENTRY_DSN is set so
 * dev / preview environments stay quiet. Sample rates are intentionally
 * conservative — bump tracesSampleRate when investigating perf issues.
 */
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    integrations: [],
  });
}
