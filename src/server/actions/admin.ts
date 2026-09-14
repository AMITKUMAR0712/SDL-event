"use server";

import { headers } from "next/headers";

import { requireRole } from "@/lib/authz";
import {
  categoryAdminSchema,
  cityAdminSchema,
  couponAdminSchema,
  planAdminSchema,
} from "@/schemas/admin";
import type { ActionResult } from "@/server/actions/auth";
import {
  approveBanquetKyc,
  approveVendorKyc,
  createCategory,
  createCity,
  createPlan,
  createPlatformCoupon,
  deleteCategory,
  deleteCity,
  deleteContactMessage,
  deleteCoupon,
  deletePlan,
  rejectBanquetKyc,
  rejectVendorKyc,
  setUserStatus,
  updateCategory,
  updateCity,
  updatePlan,
  updatePlatformCoupon,
  updateSettingValue,
} from "@/server/services/admin";
import { expireOverdueSubscriptions } from "@/server/services/subscription";

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

export async function updatePlatformCouponAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const ctx = await adminContext();
  const parsed = couponAdminSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await updatePlatformCoupon(id, parsed.data, ctx);
  return { ok: true, data: undefined };
}

export async function deleteCouponAction(id: string): Promise<ActionResult> {
  const ctx = await adminContext();
  await deleteCoupon(id, ctx);
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

export async function deleteCityAction(id: string): Promise<ActionResult> {
  const ctx = await adminContext();
  await deleteCity(id, ctx);
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

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const ctx = await adminContext();
  await deleteCategory(id, ctx);
  return { ok: true, data: undefined };
}

export async function createPlanAction(input: unknown): Promise<ActionResult> {
  const ctx = await adminContext();
  const parsed = planAdminSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await createPlan(parsed.data, ctx);
  return { ok: true, data: undefined };
}

export async function updatePlanAction(id: string, input: unknown): Promise<ActionResult> {
  const ctx = await adminContext();
  const parsed = planAdminSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await updatePlan(id, parsed.data, ctx);
  return { ok: true, data: undefined };
}

export async function deletePlanAction(id: string): Promise<ActionResult> {
  const ctx = await adminContext();
  await deletePlan(id, ctx);
  return { ok: true, data: undefined };
}

export async function deleteContactMessageAction(id: string): Promise<ActionResult> {
  const ctx = await adminContext();
  await deleteContactMessage(id, ctx);
  return { ok: true, data: undefined };
}

/** On-demand version of the expire-subscriptions cron, for testing/demo
 * environments where no external scheduler is wired up yet. */
export async function runSubscriptionExpirySweepAction(): Promise<ActionResult<{ count: number }>> {
  await adminContext();
  const count = await expireOverdueSubscriptions();
  return { ok: true, data: { count } };
}
