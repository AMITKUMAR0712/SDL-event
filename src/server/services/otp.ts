import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getRedis } from "@/lib/redis";

const OTP_TTL_SECONDS = 5 * 60;
const OTP_MAX_ATTEMPTS = 3;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

function codeKey(phone: string) {
  return `otp:code:${phone}`;
}
function attemptsKey(phone: string) {
  return `otp:attempts:${phone}`;
}
function cooldownKey(phone: string) {
  return `otp:cooldown:${phone}`;
}

function generateSixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export type RequestOtpResult =
  { ok: true } | { ok: false; reason: "COOLDOWN"; resendInSeconds: number };

/**
 * Generates and stores a fresh OTP for `phone` (5-minute TTL, resets the
 * attempt counter), then delivers it over SMS via MSG91 — or, when
 * MSG91_AUTH_KEY isn't configured (local dev), logs it instead so the flow
 * is testable without a real SMS budget.
 *
 * Rate limiting per IP/phone is the caller's responsibility (see
 * src/lib/rate-limit.ts) — this function only enforces the resend cooldown,
 * which is OTP-specific business logic rather than generic rate limiting.
 */
export async function requestOtp(phone: string): Promise<RequestOtpResult> {
  const redis = getRedis();

  const cooldownTtl = await redis.ttl(cooldownKey(phone));
  if (cooldownTtl > 0) {
    return { ok: false, reason: "COOLDOWN", resendInSeconds: cooldownTtl };
  }

  const code = generateSixDigitCode();
  await redis.set(codeKey(phone), code, { exSeconds: OTP_TTL_SECONDS });
  await redis.del(attemptsKey(phone));
  await redis.set(cooldownKey(phone), "1", { exSeconds: OTP_RESEND_COOLDOWN_SECONDS });

  await deliverOtp(phone, code);

  return { ok: true };
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: "EXPIRED_OR_NOT_FOUND" }
  | { ok: false; reason: "TOO_MANY_ATTEMPTS" }
  | { ok: false; reason: "INCORRECT"; attemptsRemaining: number };

export async function verifyOtp(phone: string, submittedCode: string): Promise<VerifyOtpResult> {
  const redis = getRedis();

  const storedCode = await redis.get(codeKey(phone));
  if (!storedCode) {
    return { ok: false, reason: "EXPIRED_OR_NOT_FOUND" };
  }

  const attempts = await redis.incr(attemptsKey(phone));
  if (attempts === 1) {
    await redis.expire(attemptsKey(phone), OTP_TTL_SECONDS);
  }
  if (attempts > OTP_MAX_ATTEMPTS) {
    return { ok: false, reason: "TOO_MANY_ATTEMPTS" };
  }

  if (storedCode !== submittedCode) {
    return {
      ok: false,
      reason: "INCORRECT",
      attemptsRemaining: Math.max(0, OTP_MAX_ATTEMPTS - attempts),
    };
  }

  await redis.del(codeKey(phone));
  await redis.del(attemptsKey(phone));
  return { ok: true };
}

/**
 * Sends the OTP over SMS via MSG91's Flow API
 * (POST https://control.msg91.com/api/v5/flow, `authkey` header,
 * `{ template_id, sender, recipients: [{ mobiles, VAR1 }] }` body — verified
 * against MSG91's current docs, not guessed). The template's approved
 * placeholder name may not actually be "VAR1"; confirm it against the
 * specific template configured in MSG91_OTP_TEMPLATE_ID before go-live.
 */
async function deliverOtp(phone: string, code: string): Promise<void> {
  if (!env.MSG91_AUTH_KEY || !env.MSG91_OTP_TEMPLATE_ID) {
    logger.warn("[otp] MSG91 not configured — logging OTP instead of sending SMS", { phone, code });
    return;
  }

  const mobile = phone.replace(/^\+/, "");

  const response = await fetch("https://control.msg91.com/api/v5/flow", {
    method: "POST",
    headers: {
      authkey: env.MSG91_AUTH_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      template_id: env.MSG91_OTP_TEMPLATE_ID,
      sender: env.MSG91_SENDER_ID || undefined,
      recipients: [{ mobiles: mobile, VAR1: code }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error("[otp] MSG91 send failed", { status: response.status, body });
    throw new Error("Failed to send OTP SMS");
  }
}
