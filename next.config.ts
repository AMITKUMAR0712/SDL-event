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
  // Explicit, not left to the default-src fallback — scoped to our own
  // origin plus Cloudinary (the configured media store), not arbitrary
  // https: hosts, so an admin pasting a random third-party URL into a
  // video field still gets blocked rather than silently trusted.
  "media-src 'self' https://res.cloudinary.com",
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
  images: {
    remotePatterns: [
      // Default vendor/banquet cover + gallery photos (prisma/seed.ts mock
      // data and real onboarding alike, see @/lib/category-images) are
      // category-matched Unsplash stock photos — real uploads go through
      // Cloudinary/S3 (below) once those are configured.
      { protocol: "https", hostname: "images.unsplash.com" },
      // TODO: remove once `pnpm prisma migrate reset` has been run against
      // every environment — only still-unseeded rows from the old
      // picsum.photos-based mock data need this.
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      ...(process.env.AWS_CLOUDFRONT_DOMAIN
        ? [{ protocol: "https" as const, hostname: process.env.AWS_CLOUDFRONT_DOMAIN }]
        : []),
    ],
  },
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
