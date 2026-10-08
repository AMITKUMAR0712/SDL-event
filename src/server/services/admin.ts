import type { Prisma } from "@prisma/client";
import { revalidatePath, updateTag } from "next/cache";

import { db } from "@/lib/db";
import type {
  CategoryAdminInput,
  CityAdminInput,
  CouponAdminInput,
  PlanAdminInput,
} from "@/schemas/admin";
import { HEADER_SEARCH_OPTIONS_TAG } from "@/server/repositories/catalog";
import { transitionBooking } from "@/server/services/booking";
import { notify } from "@/server/services/notification";
import { notifySearchEnginesOfUpdate } from "@/server/services/search-engine-ping";

type AuditContext = { actorId: string; ip?: string; userAgent?: string };

async function logAdminAction(
  ctx: AuditContext,
  action: string,
  entityType: string,
  entityId: string,
  before: unknown,
  after: unknown,
) {
  await db.auditLog.create({
    data: {
      actorId: ctx.actorId,
      action,
      entityType,
      entityId,
      before: (before ?? {}) as Prisma.InputJsonValue,
      after: (after ?? {}) as Prisma.InputJsonValue,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    },
  });
}

export async function approveVendorKyc(vendorId: string, ctx: AuditContext) {
  const before = await db.vendorProfile.findUnique({ where: { id: vendorId } });
  const after = await db.vendorProfile.update({
    where: { id: vendorId },
    data: { kycStatus: "APPROVED", isPublished: true, publishedAt: new Date() },
  });
  await logAdminAction(ctx, "vendor.kyc_approve", "VendorProfile", vendorId, before, after);
  notifySearchEnginesOfUpdate([`/vendor/${after.slug}`]).catch(() => {});
  await notify(after.userId, "EMAIL", "kyc.approved", {
    name: after.businessName,
    profileUrl: `/vendor/${after.slug}`,
  });
  return after;
}

export async function rejectVendorKyc(vendorId: string, ctx: AuditContext) {
  const before = await db.vendorProfile.findUnique({ where: { id: vendorId } });
  const after = await db.vendorProfile.update({
    where: { id: vendorId },
    data: { kycStatus: "REJECTED", isPublished: false },
  });
  await logAdminAction(ctx, "vendor.kyc_reject", "VendorProfile", vendorId, before, after);
  await notify(after.userId, "EMAIL", "kyc.rejected", { name: after.businessName });
  return after;
}

export async function approveBanquetKyc(banquetId: string, ctx: AuditContext) {
  const before = await db.banquetProfile.findUnique({ where: { id: banquetId } });
  const after = await db.banquetProfile.update({
    where: { id: banquetId },
    data: { kycStatus: "APPROVED", isPublished: true, publishedAt: new Date() },
  });
  await logAdminAction(ctx, "banquet.kyc_approve", "BanquetProfile", banquetId, before, after);
  notifySearchEnginesOfUpdate([`/banquet/${after.slug}`]).catch(() => {});
  await notify(after.userId, "EMAIL", "kyc.approved", {
    name: after.venueName,
    profileUrl: `/banquet/${after.slug}`,
  });
  return after;
}

export async function rejectBanquetKyc(banquetId: string, ctx: AuditContext) {
  const before = await db.banquetProfile.findUnique({ where: { id: banquetId } });
  const after = await db.banquetProfile.update({
    where: { id: banquetId },
    data: { kycStatus: "REJECTED", isPublished: false },
  });
  await logAdminAction(ctx, "banquet.kyc_reject", "BanquetProfile", banquetId, before, after);
  await notify(after.userId, "EMAIL", "kyc.rejected", { name: after.venueName });
  return after;
}

// Setting keys whose value is read by a statically-cached page, so a save
// needs to bust that page's cache immediately rather than wait out its ISR
// revalidate window.
const SETTING_KEY_REVALIDATE_PATHS: Record<string, string[]> = {
  popup_video: ["/"],
  vendor_guide_video: ["/dashboard/vendor/onboarding"],
};

export async function updateSettingValue(key: string, value: unknown, ctx: AuditContext) {
  const before = await db.setting.findUnique({ where: { key } });
  const after = await db.setting.upsert({
    where: { key },
    create: { key, value: value as Prisma.InputJsonValue },
    update: { value: value as Prisma.InputJsonValue },
  });
  await logAdminAction(ctx, "setting.update", "Setting", key, before, after);
  for (const path of SETTING_KEY_REVALIDATE_PATHS[key] ?? []) revalidatePath(path);
  return after;
}

export async function setUserStatus(
  userId: string,
  status: "ACTIVE" | "SUSPENDED" | "BANNED",
  ctx: AuditContext,
) {
  const before = await db.user.findUnique({ where: { id: userId } });
  const after = await db.user.update({ where: { id: userId }, data: { status } });
  await logAdminAction(ctx, "user.status_change", "User", userId, before, after);
  return after;
}

export type DeleteUserResult =
  { ok: true } | { ok: false; reason: "NOT_FOUND" | "SELF" | "ADMIN_PROTECTED" };

/** Soft delete — the row stays (other tables reference it: bookings,
 * reviews, audit log actor, etc.) but it's hidden from admin lists and,
 * per the deletedAt/status check added to the login flow, can no longer
 * sign in. Never lets an admin delete their own account or another admin
 * through this bulk tool, to avoid an accidental lockout. */
export async function deleteUser(userId: string, ctx: AuditContext): Promise<DeleteUserResult> {
  if (userId === ctx.actorId) return { ok: false, reason: "SELF" };

  const before = await db.user.findUnique({ where: { id: userId } });
  if (!before || before.deletedAt) return { ok: false, reason: "NOT_FOUND" };
  if (before.role === "ADMIN") return { ok: false, reason: "ADMIN_PROTECTED" };

  const after = await db.user.update({
    where: { id: userId },
    data: { deletedAt: new Date(), status: "BANNED" },
  });
  await logAdminAction(ctx, "user.delete", "User", userId, before, after);
  return { ok: true };
}

export async function updatePlatformCoupon(id: string, input: CouponAdminInput, ctx: AuditContext) {
  const before = await db.coupon.findUnique({ where: { id } });
  const after = await db.coupon.update({
    where: { id },
    data: { ...input, code: input.code.toUpperCase() },
  });
  await logAdminAction(ctx, "coupon.update", "Coupon", id, before, after);
  return after;
}

/** Soft delete — coupons already track deletedAt, and past redemptions
 * reference the row, so it's deactivated + marked rather than removed. */
export async function deleteCoupon(id: string, ctx: AuditContext) {
  const before = await db.coupon.findUnique({ where: { id } });
  const after = await db.coupon.update({
    where: { id },
    data: { isActive: false, deletedAt: new Date() },
  });
  await logAdminAction(ctx, "coupon.delete", "Coupon", id, before, after);
  return after;
}

export type CancelBookingResult =
  { ok: true } | { ok: false; reason: "NOT_FOUND" | "INVALID_TRANSITION" };

/** Bookings are event-sourced and are never deleted (see the schema's
 * top-of-file conventions comment) — a booking carries GST invoice history,
 * so removing the row would be a record-keeping problem, not just a UI one.
 * The admin-facing "delete" is really a forced cancellation, which already
 * runs the normal refund-policy calculation; this just adds the audit log
 * entry that admin mutations require. */
export async function cancelBookingAsAdmin(
  bookingId: string,
  ctx: AuditContext,
): Promise<CancelBookingResult> {
  const before = await db.booking.findUnique({ where: { id: bookingId } });
  if (!before) return { ok: false, reason: "NOT_FOUND" };

  const result = await transitionBooking(bookingId, "CANCELLED", "ADMIN");
  if (!result.ok) return result;

  const after = await db.booking.findUnique({ where: { id: bookingId } });
  await logAdminAction(ctx, "booking.cancel", "Booking", bookingId, before, after);
  return { ok: true };
}

export async function createPlatformCoupon(
  input: {
    code: string;
    discountType: "PERCENT" | "FLAT";
    value: number;
    maxDiscountPaise?: number;
    minOrderPaise?: number;
    appliesTo: "BOOKING" | "SUBSCRIPTION" | "UNLOCK";
    startsAt: Date;
    endsAt: Date;
  },
  ctx: AuditContext,
) {
  const coupon = await db.coupon.create({
    data: { ...input, code: input.code.toUpperCase(), ownerType: "PLATFORM" },
  });
  await logAdminAction(ctx, "coupon.create", "Coupon", coupon.id, null, coupon);
  return coupon;
}

/**
 * The home page's "Popular cities/categories" images and the navbar's search
 * options are both fed by an `unstable_cache`d/ISR'd read (1h window, see
 * catalog.ts) — without an explicit revalidate here, an admin editing a
 * city/category wouldn't see it reflected for up to an hour. Found via
 * testing this feature end-to-end, not by inspection.
 */
export async function createCity(input: CityAdminInput, ctx: AuditContext) {
  const city = await db.city.create({ data: { ...input, imageUrl: input.imageUrl || null } });
  await logAdminAction(ctx, "city.create", "City", city.id, null, city);
  revalidatePath("/");
  updateTag(HEADER_SEARCH_OPTIONS_TAG);
  revalidatePath(`/${city.slug}`);
  return city;
}

export async function updateCity(id: string, input: CityAdminInput, ctx: AuditContext) {
  const before = await db.city.findUnique({ where: { id } });
  const after = await db.city.update({
    where: { id },
    data: { ...input, imageUrl: input.imageUrl || null },
  });
  await logAdminAction(ctx, "city.update", "City", id, before, after);
  revalidatePath("/");
  updateTag(HEADER_SEARCH_OPTIONS_TAG);
  revalidatePath(`/${after.slug}`);
  if (before && before.slug !== after.slug) revalidatePath(`/${before.slug}`);
  return after;
}

/** Soft delete — cities are referenced by vendors/banquets/localities, so
 * this deactivates rather than removes the row (same as unchecking "Active"
 * in the form, just exposed as an explicit action). */
export async function deleteCity(id: string, ctx: AuditContext) {
  const before = await db.city.findUnique({ where: { id } });
  const after = await db.city.update({ where: { id }, data: { isActive: false } });
  await logAdminAction(ctx, "city.delete", "City", id, before, after);
  revalidatePath("/");
  updateTag(HEADER_SEARCH_OPTIONS_TAG);
  if (after.slug) revalidatePath(`/${after.slug}`);
  return after;
}

export async function createCategory(input: CategoryAdminInput, ctx: AuditContext) {
  const category = await db.category.create({
    data: { ...input, imageUrl: input.imageUrl || null },
  });
  await logAdminAction(ctx, "category.create", "Category", category.id, null, category);
  revalidatePath("/");
  updateTag(HEADER_SEARCH_OPTIONS_TAG);
  revalidatePath(`/categories/${category.slug}`);
  return category;
}

export async function updateCategory(id: string, input: CategoryAdminInput, ctx: AuditContext) {
  const before = await db.category.findUnique({ where: { id } });
  const after = await db.category.update({
    where: { id },
    data: { ...input, imageUrl: input.imageUrl || null },
  });
  await logAdminAction(ctx, "category.update", "Category", id, before, after);
  revalidatePath("/");
  updateTag(HEADER_SEARCH_OPTIONS_TAG);
  revalidatePath(`/categories/${after.slug}`);
  if (before && before.slug !== after.slug) revalidatePath(`/categories/${before.slug}`);
  return after;
}

/** Soft delete — categories are referenced by vendors/banquets/service
 * catalog entries, so this deactivates rather than removes the row. */
export async function deleteCategory(id: string, ctx: AuditContext) {
  const before = await db.category.findUnique({ where: { id } });
  const after = await db.category.update({ where: { id }, data: { isActive: false } });
  await logAdminAction(ctx, "category.delete", "Category", id, before, after);
  revalidatePath("/");
  updateTag(HEADER_SEARCH_OPTIONS_TAG);
  revalidatePath(`/categories/${after.slug}`);
  return after;
}

function toFeatureCreateInput(features: PlanAdminInput["features"]) {
  return features.map((f) => ({
    key: f.key,
    label: f.label,
    valueInt: f.type === "INT" ? (f.valueInt ?? 0) : null,
    valueBool: f.type === "BOOL" ? (f.valueBool ?? false) : null,
    valueText: f.type === "TEXT" ? (f.valueText ?? "") : null,
  }));
}

export async function createPlan(input: PlanAdminInput, ctx: AuditContext) {
  const { features, ...planFields } = input;
  const plan = await db.subscriptionPlan.create({
    data: { ...planFields, features: { create: toFeatureCreateInput(features) } },
    include: { features: true },
  });
  await logAdminAction(ctx, "plan.create", "SubscriptionPlan", plan.id, null, plan);
  revalidatePath("/");
  return plan;
}

/** Replaces the feature list wholesale rather than diffing — plans have a
 * handful of features, so this is simpler and just as correct. */
export async function updatePlan(id: string, input: PlanAdminInput, ctx: AuditContext) {
  const before = await db.subscriptionPlan.findUnique({
    where: { id },
    include: { features: true },
  });
  const { features, ...planFields } = input;
  const after = await db.$transaction(async (tx) => {
    await tx.planFeature.deleteMany({ where: { planId: id } });
    return tx.subscriptionPlan.update({
      where: { id },
      data: { ...planFields, features: { create: toFeatureCreateInput(features) } },
      include: { features: true },
    });
  });
  await logAdminAction(ctx, "plan.update", "SubscriptionPlan", id, before, after);
  revalidatePath("/");
  return after;
}

/** Soft delete — plans are referenced by past/active subscriptions, so this
 * deactivates (hides from the public pricing pages) rather than removes. */
export async function deletePlan(id: string, ctx: AuditContext) {
  const before = await db.subscriptionPlan.findUnique({ where: { id } });
  const after = await db.subscriptionPlan.update({ where: { id }, data: { isActive: false } });
  await logAdminAction(ctx, "plan.delete", "SubscriptionPlan", id, before, after);
  revalidatePath("/");
  return after;
}

/** Contact messages aren't referenced anywhere else, so a real delete is safe. */
export async function deleteContactMessage(id: string, ctx: AuditContext) {
  const before = await db.contactMessage.findUnique({ where: { id } });
  await db.contactMessage.delete({ where: { id } });
  await logAdminAction(ctx, "contact_message.delete", "ContactMessage", id, before, null);
}
