import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { redeemCoupon, validateCoupon } from "@/server/services/coupon";

describe("coupon validation and redemption (integration, hits the real dev DB)", () => {
  const suffix = Date.now();
  let userId: string;
  let couponId: string;

  afterAll(async () => {
    await db.couponRedemption.deleteMany({ where: { userId } });
    await db.coupon.deleteMany({ where: { id: couponId } });
    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
  });

  it("sets up a fresh coupon and user", async () => {
    const user = await db.user.create({
      data: { email: `coupon-test-${suffix}@example.com`, role: "CUSTOMER" },
    });
    userId = user.id;

    const coupon = await db.coupon.create({
      data: {
        code: `TEST${suffix}`,
        ownerType: "PLATFORM",
        discountType: "PERCENT",
        value: 10,
        maxDiscountPaise: 50_000,
        minOrderPaise: 10_000,
        appliesTo: "BOOKING",
        usageLimitPerUser: 1,
        startsAt: new Date(Date.now() - 1000),
        endsAt: new Date(Date.now() + 1000 * 60 * 60),
        isActive: true,
      },
    });
    couponId = coupon.id;
  });

  it("rejects an order below the minimum", async () => {
    const result = await validateCoupon(`TEST${suffix}`, "BOOKING", 5_000, userId);
    expect(result).toEqual({ ok: false, reason: "MIN_ORDER_NOT_MET" });
  });

  it("caps a percent discount at maxDiscountPaise", async () => {
    const result = await validateCoupon(`TEST${suffix}`, "BOOKING", 1_000_000, userId);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.discountPaise).toBe(50_000); // 10% of 1,000,000 = 100,000, capped at 50,000
  });

  it("redeems once successfully, then refuses a second redemption for the same user", async () => {
    const first = await redeemCoupon("TEST" + suffix, "BOOKING", 20_000, userId, {});
    expect(first.ok).toBe(true);

    const second = await redeemCoupon("TEST" + suffix, "BOOKING", 20_000, userId, {});
    expect(second).toEqual({ ok: false, reason: "PER_USER_LIMIT_REACHED" });
  });

  it("rejects the wrong appliesTo context", async () => {
    const result = await validateCoupon(`TEST${suffix}`, "SUBSCRIPTION", 20_000, userId);
    expect(result).toEqual({ ok: false, reason: "WRONG_APPLICATION" });
  });
});
