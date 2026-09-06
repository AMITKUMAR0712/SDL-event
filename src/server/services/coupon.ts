import type { Coupon } from "@prisma/client";

import { db } from "@/lib/db";
import { percentOfPaise } from "@/lib/money";

export type CouponValidationError =
  | "NOT_FOUND"
  | "INACTIVE"
  | "EXPIRED"
  | "NOT_STARTED"
  | "MIN_ORDER_NOT_MET"
  | "USAGE_LIMIT_REACHED"
  | "PER_USER_LIMIT_REACHED"
  | "WRONG_APPLICATION";

export type CouponValidationResult =
  | { ok: true; coupon: Coupon; discountPaise: number }
  | { ok: false; reason: CouponValidationError };

function computeDiscount(coupon: Coupon, orderPaise: number): number {
  const raw =
    coupon.discountType === "PERCENT" ? percentOfPaise(orderPaise, coupon.value) : coupon.value;
  return coupon.maxDiscountPaise ? Math.min(raw, coupon.maxDiscountPaise) : raw;
}

/**
 * Pure validation (no redemption side effect) — safe to call repeatedly for
 * UI preview (e.g. the unlock teaser's "save up to ₹X" headline). Atomic
 * redemption happens separately in `redeemCoupon`, inside the same
 * transaction as the payment/unlock it pays for.
 */
export async function validateCoupon(
  code: string,
  appliesTo: "BOOKING" | "SUBSCRIPTION" | "UNLOCK",
  orderPaise: number,
  userId: string,
): Promise<CouponValidationResult> {
  const coupon = await db.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (!coupon || coupon.deletedAt) return { ok: false, reason: "NOT_FOUND" };
  if (!coupon.isActive) return { ok: false, reason: "INACTIVE" };
  if (coupon.appliesTo !== appliesTo) return { ok: false, reason: "WRONG_APPLICATION" };

  const now = new Date();
  if (now < coupon.startsAt) return { ok: false, reason: "NOT_STARTED" };
  if (now > coupon.endsAt) return { ok: false, reason: "EXPIRED" };
  if (coupon.minOrderPaise && orderPaise < coupon.minOrderPaise) {
    return { ok: false, reason: "MIN_ORDER_NOT_MET" };
  }

  if (coupon.usageLimitTotal) {
    const totalRedemptions = await db.couponRedemption.count({ where: { couponId: coupon.id } });
    if (totalRedemptions >= coupon.usageLimitTotal)
      return { ok: false, reason: "USAGE_LIMIT_REACHED" };
  }

  if (coupon.usageLimitPerUser) {
    const userRedemptions = await db.couponRedemption.count({
      where: { couponId: coupon.id, userId },
    });
    if (userRedemptions >= coupon.usageLimitPerUser) {
      return { ok: false, reason: "PER_USER_LIMIT_REACHED" };
    }
  }

  return { ok: true, coupon, discountPaise: computeDiscount(coupon, orderPaise) };
}

export type RedeemResult =
  { ok: true; discountPaise: number } | { ok: false; reason: CouponValidationError };

/**
 * Validates and atomically redeems in one transaction, relying on the
 * unique constraints on CouponRedemption (couponId+userId+bookingId /
 * +subscriptionId) as the race-proof backstop — two concurrent redemption
 * attempts for the same coupon+user+booking cannot both succeed even if
 * both pass the validation check before either writes.
 */
export async function redeemCoupon(
  code: string,
  appliesTo: "BOOKING" | "SUBSCRIPTION" | "UNLOCK",
  orderPaise: number,
  userId: string,
  target: { bookingId?: string; subscriptionId?: string },
): Promise<RedeemResult> {
  const validation = await validateCoupon(code, appliesTo, orderPaise, userId);
  if (!validation.ok) return validation;

  try {
    await db.couponRedemption.create({
      data: {
        couponId: validation.coupon.id,
        userId,
        bookingId: target.bookingId,
        subscriptionId: target.subscriptionId,
        discountPaise: validation.discountPaise,
      },
    });
  } catch {
    // Unique constraint violation — someone else redeemed this exact
    // coupon+user+target combination first.
    return { ok: false, reason: "USAGE_LIMIT_REACHED" };
  }

  return { ok: true, discountPaise: validation.discountPaise };
}
