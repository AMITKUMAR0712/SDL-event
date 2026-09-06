import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number");

export const indianPhoneSchema = z
  .string()
  .regex(/^\+91[6-9]\d{9}$/, "Enter a valid Indian mobile number, e.g. +919876543210");

export const registerSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.email("Enter a valid email address"),
  password: passwordSchema,
  role: z.enum(["CUSTOMER", "VENDOR", "BANQUET_OWNER"]),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const requestOtpSchema = z.object({
  phone: indianPhoneSchema,
});
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.object({
  phone: indianPhoneSchema,
  code: z.string().length(6, "Enter the 6-digit code"),
  name: z.string().min(2).optional(),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  email: z.email(),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
