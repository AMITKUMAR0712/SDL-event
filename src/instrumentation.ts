import { env } from "@/lib/env";

/** Next.js's own hook (not Sentry-specific) — called once per server runtime at boot. */
export async function register() {
  if (!env.SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({ dsn: env.SENTRY_DSN, tracesSampleRate: 0.1 });
  } else if (process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({ dsn: env.SENTRY_DSN, tracesSampleRate: 0.1 });
  }
}

export async function onRequestError(
  ...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>
) {
  if (!env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
}
