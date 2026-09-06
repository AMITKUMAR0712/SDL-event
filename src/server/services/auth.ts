import crypto from "node:crypto";

import bcrypt from "bcryptjs";

import { env } from "@/lib/env";
import {
  createCustomerWithPhone,
  createUserWithPassword,
  findUserByEmail,
  findUserByPhone,
  recordFailedLogin,
  resetFailedLogins,
  setPasswordHash,
} from "@/server/repositories/user";
import {
  consumeVerificationToken,
  createVerificationToken,
} from "@/server/repositories/verification-token";
import { logSecurityEvent } from "@/server/services/audit";
import { sendEmail } from "@/server/services/email";
import { requestOtp, verifyOtp } from "@/server/services/otp";

export const LOGIN_LOCK_THRESHOLD = 10;
export const LOGIN_LOCK_MINUTES = 30;
const BCRYPT_ROUNDS = 12;
const PASSWORD_RESET_TTL_MINUTES = 60;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export type RegisterResult =
  | { ok: true; user: { id: string; name: string; email: string; role: string } }
  | { ok: false; reason: "EMAIL_TAKEN" };

export async function registerWithPassword(input: {
  name: string;
  email: string;
  password: string;
  role: "CUSTOMER" | "VENDOR" | "BANQUET_OWNER";
}): Promise<RegisterResult> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    return { ok: false, reason: "EMAIL_TAKEN" };
  }

  const passwordHash = await hashPassword(input.password);
  const user = await createUserWithPassword({ ...input, passwordHash });

  await logSecurityEvent({ actorId: user.id, action: "auth.registered", entityId: user.id });

  return {
    ok: true,
    user: {
      id: user.id,
      name: user.name ?? input.name,
      email: user.email ?? input.email,
      role: user.role,
    },
  };
}

type AuthContext = { ip?: string; userAgent?: string };

export type PasswordAuthResult =
  | { ok: true; user: { id: string; name: string | null; email: string | null; role: string } }
  | { ok: false; reason: "INVALID_CREDENTIALS" }
  | { ok: false; reason: "LOCKED"; lockedUntil: Date };

export async function authenticateWithPassword(
  email: string,
  password: string,
  ctx: AuthContext = {},
): Promise<PasswordAuthResult> {
  const user = await findUserByEmail(email);

  if (!user || !user.passwordHash) {
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    return { ok: false, reason: "LOCKED", lockedUntil: user.lockedUntil };
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    const updated = await recordFailedLogin(user.id, LOGIN_LOCK_THRESHOLD, LOGIN_LOCK_MINUTES);
    await logSecurityEvent({
      actorId: user.id,
      action: "auth.login_failed",
      entityId: user.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      meta: { failedLoginCount: updated.failedLoginCount },
    });

    if (updated.lockedUntil) {
      await logSecurityEvent({
        actorId: user.id,
        action: "auth.account_locked",
        entityId: user.id,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        meta: { lockedUntil: updated.lockedUntil },
      });
      return { ok: false, reason: "LOCKED", lockedUntil: updated.lockedUntil };
    }

    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  await resetFailedLogins(user.id);
  await logSecurityEvent({
    actorId: user.id,
    action: "auth.login_success",
    entityId: user.id,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return { ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

export type PhoneOtpRequestResult = Awaited<ReturnType<typeof requestOtp>>;

export async function requestPhoneOtpLogin(phone: string): Promise<PhoneOtpRequestResult> {
  const result = await requestOtp(phone);
  if (result.ok) {
    await logSecurityEvent({ action: "auth.otp_requested", entityId: phone });
  }
  return result;
}

export type PhoneOtpVerifyResult =
  | { ok: true; user: { id: string; name: string | null; phone: string | null; role: string } }
  | { ok: false; reason: Exclude<Awaited<ReturnType<typeof verifyOtp>>, { ok: true }>["reason"] };

/** Verifies the OTP and finds-or-creates a CUSTOMER account for the phone number. */
export async function verifyPhoneOtpLogin(
  phone: string,
  code: string,
  name?: string,
): Promise<PhoneOtpVerifyResult> {
  const result = await verifyOtp(phone, code);

  if (!result.ok) {
    await logSecurityEvent({
      action: "auth.otp_failed",
      entityId: phone,
      meta: { reason: result.reason },
    });
    return { ok: false, reason: result.reason };
  }

  const existing = await findUserByPhone(phone);
  const user = existing ?? (await createCustomerWithPhone(phone, name));

  await logSecurityEvent({
    actorId: user.id,
    action: existing ? "auth.otp_verified" : "auth.registered",
    entityId: user.id,
  });

  return { ok: true, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } };
}

/**
 * Always resolves the same way whether or not the email exists, so the
 * caller (a server action) can return an identical response either way and
 * avoid leaking which emails are registered.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await findUserByEmail(email);
  if (!user) return;

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60_000);
  await createVerificationToken(email, token, expires);

  const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?email=${encodeURIComponent(email)}&token=${token}`;
  await sendEmail({
    to: email,
    subject: "Reset your MakeGlowOver password",
    html: `<p>Click the link below to reset your password. This link expires in ${PASSWORD_RESET_TTL_MINUTES} minutes.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });

  await logSecurityEvent({
    actorId: user.id,
    action: "auth.password_reset_requested",
    entityId: user.id,
  });
}

export type ResetPasswordResult = { ok: true } | { ok: false; reason: "INVALID_OR_EXPIRED_TOKEN" };

export async function resetPassword(
  email: string,
  token: string,
  newPassword: string,
): Promise<ResetPasswordResult> {
  const record = await consumeVerificationToken(email, token);
  if (!record) {
    return { ok: false, reason: "INVALID_OR_EXPIRED_TOKEN" };
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return { ok: false, reason: "INVALID_OR_EXPIRED_TOKEN" };
  }

  const passwordHash = await hashPassword(newPassword);
  await setPasswordHash(user.id, passwordHash);
  await logSecurityEvent({
    actorId: user.id,
    action: "auth.password_reset_completed",
    entityId: user.id,
  });

  return { ok: true };
}
