import { z } from "zod";

/**
 * Every environment variable the app can use, validated once at boot.
 * Add new variables here (never read `process.env.X` directly elsewhere)
 * so a missing/invalid value fails fast with a readable message instead of
 * surfacing as a runtime crash deep in a request handler.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.url(),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Auth.js
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_URL: z.url().optional(),
  AUTH_GOOGLE_ID: z.string().optional().default(""),
  AUTH_GOOGLE_SECRET: z.string().optional().default(""),

  // Phone OTP (MSG91)
  MSG91_AUTH_KEY: z.string().optional().default(""),
  MSG91_SENDER_ID: z.string().optional().default(""),
  MSG91_OTP_TEMPLATE_ID: z.string().optional().default(""),

  // Payments (Razorpay)
  RAZORPAY_KEY_ID: z.string().optional().default(""),
  RAZORPAY_KEY_SECRET: z.string().optional().default(""),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(""),

  // Media storage
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
  AWS_ACCESS_KEY_ID: z.string().optional().default(""),
  AWS_SECRET_ACCESS_KEY: z.string().optional().default(""),
  AWS_REGION: z.string().optional().default("ap-south-1"),
  AWS_S3_BUCKET: z.string().optional().default(""),
  AWS_CLOUDFRONT_DOMAIN: z.string().optional().default(""),

  // Email
  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().optional().default("SajDhajLo <no-reply@sajdhajlo.com>"),
  // Gmail SMTP fallback (used when RESEND_API_KEY isn't set) — an "app
  // password" from the Gmail account's security settings, not the account
  // password itself.
  GMAIL_USER: z.string().optional().default(""),
  GMAIL_APP_PASSWORD: z.string().optional().default(""),

  // WhatsApp Cloud API
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(""),
  WHATSAPP_ACCESS_TOKEN: z.string().optional().default(""),
  WHATSAPP_VERIFY_TOKEN: z.string().optional().default(""),

  // Redis (Upstash)
  UPSTASH_REDIS_REST_URL: z.string().optional().default(""),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().default(""),

  // SEO / analytics
  NEXT_PUBLIC_GA4_MEASUREMENT_ID: z.string().optional().default(""),
  GOOGLE_SITE_VERIFICATION: z.string().optional().default(""),
  INDEXNOW_KEY: z.string().optional().default(""),
  GOOGLE_INDEXING_API_CLIENT_EMAIL: z.string().optional().default(""),
  GOOGLE_INDEXING_API_PRIVATE_KEY: z.string().optional().default(""),

  // Observability
  SENTRY_DSN: z.string().optional().default(""),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional().default(""),

  // Scheduled jobs (retry notifications, etc.) — the shared secret an external
  // scheduler (Vercel Cron, GitHub Actions) must send to trigger one.
  CRON_SECRET: z.string().optional().default(""),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = z.prettifyError(parsed.error);
    console.error(`\n❌ Invalid environment variables:\n${issues}\n`);
    throw new Error("Invalid environment variables — see log above.");
  }

  return parsed.data;
}

export const env = loadEnv();
