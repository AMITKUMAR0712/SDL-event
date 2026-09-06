import { db } from "@/lib/db";
import { getSetting } from "@/server/repositories/settings";

const ROLLING_WINDOW_DAYS = 30;

/**
 * How many more profiles this signed-in customer can fully unlock this
 * rolling 30-day window, and whether they're within quota right now.
 * Guests never reach here — src/lib/gate.ts short-circuits them to the
 * (session-less) guest quota before this is called.
 */
export async function getCustomerUnlockStatus(userId: string) {
  const quota = await getSetting("free_unlock_quota_signed_in", 5);
  const windowStart = new Date(Date.now() - ROLLING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const used = await db.unlockEvent.count({
    where: { userId, createdAt: { gte: windowStart } },
  });

  return { quota, used, remaining: Math.max(0, quota - used), withinQuota: used < quota };
}

export async function getGuestUnlockQuota() {
  return getSetting("free_unlock_quota_guest", 3);
}

export async function recordUnlock(
  userId: string,
  targetType: "VENDOR" | "BANQUET",
  targetId: string,
  source: "SUBSCRIPTION" | "COUPON" | "FREE_QUOTA",
) {
  return db.unlockEvent.create({ data: { userId, targetType, targetId, source } });
}

export async function hasActiveCustomerSubscription(userId: string): Promise<boolean> {
  const sub = await db.subscription.findFirst({
    where: { userId, status: "ACTIVE", plan: { audience: "CUSTOMER" } },
  });
  return !!sub;
}
