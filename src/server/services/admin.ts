import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

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
  return after;
}

export async function rejectVendorKyc(vendorId: string, ctx: AuditContext) {
  const before = await db.vendorProfile.findUnique({ where: { id: vendorId } });
  const after = await db.vendorProfile.update({
    where: { id: vendorId },
    data: { kycStatus: "REJECTED", isPublished: false },
  });
  await logAdminAction(ctx, "vendor.kyc_reject", "VendorProfile", vendorId, before, after);
  return after;
}

export async function approveBanquetKyc(banquetId: string, ctx: AuditContext) {
  const before = await db.banquetProfile.findUnique({ where: { id: banquetId } });
  const after = await db.banquetProfile.update({
    where: { id: banquetId },
    data: { kycStatus: "APPROVED", isPublished: true, publishedAt: new Date() },
  });
  await logAdminAction(ctx, "banquet.kyc_approve", "BanquetProfile", banquetId, before, after);
  return after;
}

export async function rejectBanquetKyc(banquetId: string, ctx: AuditContext) {
  const before = await db.banquetProfile.findUnique({ where: { id: banquetId } });
  const after = await db.banquetProfile.update({
    where: { id: banquetId },
    data: { kycStatus: "REJECTED", isPublished: false },
  });
  await logAdminAction(ctx, "banquet.kyc_reject", "BanquetProfile", banquetId, before, after);
  return after;
}

export async function updateSettingValue(key: string, value: unknown, ctx: AuditContext) {
  const before = await db.setting.findUnique({ where: { key } });
  const after = await db.setting.upsert({
    where: { key },
    create: { key, value: value as Prisma.InputJsonValue },
    update: { value: value as Prisma.InputJsonValue },
  });
  await logAdminAction(ctx, "setting.update", "Setting", key, before, after);
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
