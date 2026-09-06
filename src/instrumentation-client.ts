import * as Sentry from "@sentry/nextjs";

// NEXT_PUBLIC_SENTRY_DSN, not the server-only SENTRY_DSN in src/lib/env.ts —
// this file ships to the browser, so it can only read a NEXT_PUBLIC_ var.
// Both point at the same Sentry project; only the client needs its own copy
// of the value with that prefix.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({ dsn, tracesSampleRate: 0.1 });
}
