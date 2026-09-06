import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

// Pragmatic, not nonce-strict: a nonce-based script-src would need CSP
// injected from src/proxy.ts (the only middleware Next allows), but that file
// is Auth.js's own proxy scoped to /dashboard and /account only — widening
// its matcher to every route to also carry CSP nonces is a real improvement,
// left for a follow-up rather than risking the working auth gate under this
// phase's time budget. 'unsafe-inline' below is the honest cost of that.
//
// Dev-only additions, never shipped in a production build: 'unsafe-eval'
// (React dev mode uses eval() to reconstruct stack traces across Turbopack's
// module boundaries — never used in production React) and a `ws:` allowance
// for Turbopack's hot-reload websocket.
const isDev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://checkout.razorpay.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  "font-src 'self' data:",
  `connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://*.sentry.io https://*.ingest.us.sentry.io${isDev ? " ws://localhost:* ws://192.168.*:*" : ""}`,
  "frame-src 'self' https://api.razorpay.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

// Only uploads source maps / sets up the build-time plugin when a DSN is
// actually configured — without one this is a harmless no-op wrapper, same
// "real but silent when unconfigured" pattern as every other optional
// integration in this codebase (see src/lib/redis.ts, server/services/email.ts).
export default process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
    })
  : nextConfig;
