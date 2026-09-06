"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";

import { signIn, signOut } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  ForgotPasswordInput,
  forgotPasswordSchema,
  LoginInput,
  loginSchema,
  RegisterInput,
  registerSchema,
  RequestOtpInput,
  requestOtpSchema,
  ResetPasswordInput,
  resetPasswordSchema,
  VerifyOtpInput,
  verifyOtpSchema,
} from "@/schemas/auth";
import {
  authenticateWithPassword,
  registerWithPassword,
  requestPasswordReset,
  requestPhoneOtpLogin,
  resetPassword,
} from "@/server/services/auth";

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export async function registerAction(
  input: RegisterInput,
): Promise<ActionResult<{ role: string }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ip = await clientIp();
  const limit = await rateLimit(`register:${ip}`, 10, 60 * 60);
  if (!limit.allowed) {
    return { ok: false, error: "Too many attempts. Try again later." };
  }

  const result = await registerWithPassword(parsed.data);
  if (!result.ok) {
    return { ok: false, error: "An account with this email already exists." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Account created, but automatic sign-in failed. Please log in." };
    }
    throw error;
  }

  return { ok: true, data: { role: result.user.role } };
}

export async function loginAction(input: LoginInput): Promise<ActionResult<{ role: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ip = await clientIp();
  const limit = await rateLimit(`login:${ip}`, 20, 15 * 60);
  if (!limit.allowed) {
    return { ok: false, error: "Too many attempts. Try again later." };
  }

  // Checked directly (rather than re-reading auth() after signIn()) because the
  // JWT session cookie signIn() sets is not guaranteed visible to auth() within
  // the same server action invocation.
  const result = await authenticateWithPassword(parsed.data.email, parsed.data.password, { ip });
  if (!result.ok) {
    return { ok: false, error: "Incorrect email or password." };
  }

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Incorrect email or password." };
    }
    throw error;
  }

  return { ok: true, data: { role: result.user.role } };
}

export async function requestOtpAction(input: RequestOtpInput): Promise<ActionResult> {
  const parsed = requestOtpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ip = await clientIp();
  const [ipLimit, phoneLimit] = await Promise.all([
    rateLimit(`otp-request:ip:${ip}`, 10, 15 * 60),
    rateLimit(`otp-request:phone:${parsed.data.phone}`, 5, 15 * 60),
  ]);
  if (!ipLimit.allowed || !phoneLimit.allowed) {
    return { ok: false, error: "Too many attempts. Try again later." };
  }

  const result = await requestPhoneOtpLogin(parsed.data.phone);
  if (!result.ok) {
    return {
      ok: false,
      error: `Please wait ${result.resendInSeconds}s before requesting another code.`,
    };
  }

  return { ok: true, data: undefined };
}

export async function verifyOtpAction(input: VerifyOtpInput): Promise<ActionResult> {
  const parsed = verifyOtpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await signIn("phone-otp", { ...parsed.data, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "That code is incorrect or has expired." };
    }
    throw error;
  }

  return { ok: true, data: undefined };
}

export async function forgotPasswordAction(input: ForgotPasswordInput): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ip = await clientIp();
  const limit = await rateLimit(`forgot-password:${ip}`, 5, 15 * 60);
  if (!limit.allowed) {
    return { ok: false, error: "Too many attempts. Try again later." };
  }

  await requestPasswordReset(parsed.data.email);

  return { ok: true, data: undefined };
}

export async function resetPasswordAction(input: ResetPasswordInput): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await resetPassword(parsed.data.email, parsed.data.token, parsed.data.password);
  if (!result.ok) {
    return { ok: false, error: "This reset link is invalid or has expired." };
  }

  return { ok: true, data: undefined };
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
