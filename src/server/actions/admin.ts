"use server";

import { headers } from "next/headers";

import { requireRole } from "@/lib/authz";
import { categoryAdminSchema, cityAdminSchema, couponAdminSchema } from "@/schemas/admin";
import type { ActionResult } from "@/server/actions/auth";
import {
  approveBanquetKyc,
  approveVendorKyc,
  createCategory,
  createCity,
  createPlatformCoupon,
  rejectBanquetKyc,
  rejectVendorKyc,
  setUserStatus,
  updateCategory,
  updateCity,
  updateSettingValue,
} from "@/server/services/admin";

async function adminContext() {
  const session = await requireRole(["ADMIN"]);
  const h = await headers();
  return {
    actorId: session.user.id,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: h.get("user-agent") ?? undefined,
  };
}

export async function approveVendorKycAction(vendorId: string): Promise<ActionResult> {
  const ctx = await adminContext();
  await approveVendorKyc(vendorId, ctx);
  return { ok: true, data: undefined };
}

export async function rejectVendorKycAction(vendorId: string): Promise<ActionResult> {
  const ctx = await adminContext();
  await rejectVendorKyc(vendorId, ctx);
  return { ok: true, data: undefined };
}

export async function approveBanquetKycAction(banquetId: string): Promise<ActionResult> {
  const ctx = await adminContext();
  await approveBanquetKyc(banquetId, ctx);
  return { ok: true, data: undefined };
}

export async function rejectBanquetKycAction(banquetId: string): Promise<ActionResult> {
  const ctx = await adminContext();
  await rejectBanquetKyc(banquetId, ctx);
  return { ok: true, data: undefined };
}

export async function updateSettingAction(key: string, rawValue: string): Promise<ActionResult> {
  const ctx = await adminContext();
  let value: unknown;
  try {
    value = JSON.parse(rawValue);
  } catch {
    return { ok: false, error: 'Value must be valid JSON (e.g. 15, true, or {"a":1}).' };
  }
  await updateSettingValue(key, value, ctx);
  return { ok: true, data: undefined };
}

export async function setUserStatusAction(
  userId: string,
  status: "ACTIVE" | "SUSPENDED" | "BANNED",
): Promise<ActionResult> {
  const ctx = await adminContext();
  await setUserStatus(userId, status, ctx);
  return { ok: true, data: undefined };
}

export async function createPlatformCouponAction(input: unknown): Promise<ActionResult> {
  const ctx = await adminContext();
  const parsed = couponAdminSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await createPlatformCoupon(parsed.data, ctx);
  return { ok: true, data: undefined };
}

export async function createCityAction(input: unknown): Promise<ActionResult> {
  const ctx = await adminContext();
  const parsed = cityAdminSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await createCity(parsed.data, ctx);
  return { ok: true, data: undefined };
}

export async function updateCityAction(id: string, input: unknown): Promise<ActionResult> {
  const ctx = await adminContext();
  const parsed = cityAdminSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await updateCity(id, parsed.data, ctx);
  return { ok: true, data: undefined };
}

export async function createCategoryAction(input: unknown): Promise<ActionResult> {
  const ctx = await adminContext();
  const parsed = categoryAdminSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await createCategory(parsed.data, ctx);
  return { ok: true, data: undefined };
}

export async function updateCategoryAction(id: string, input: unknown): Promise<ActionResult> {
  const ctx = await adminContext();
  const parsed = categoryAdminSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await updateCategory(id, parsed.data, ctx);
  return { ok: true, data: undefined };
}
