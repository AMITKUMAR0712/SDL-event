import { db } from "@/lib/db";

/**
 * A vendor/banquet's public visibility tracks their subscription period:
 * expired -> unpublished (hidden from the site), paid/renewed -> republished.
 * Called opportunistically (dashboard visits, profile page views, right
 * after a renewal payment) rather than relying solely on a cron job, so the
 * state is correct even without an external scheduler wired up.
 */
export async function syncPublishStatusForUser(userId: string): Promise<void> {
  const subscription = await db.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (!subscription) return;

  const expired = subscription.currentPeriodEnd.getTime() < Date.now();

  const [vendor, banquet] = await Promise.all([
    db.vendorProfile.findUnique({
      where: { userId },
      select: { id: true, isPublished: true, kycStatus: true },
    }),
    db.banquetProfile.findUnique({
      where: { userId },
      select: { id: true, isPublished: true, kycStatus: true },
    }),
  ]);

  if (expired) {
    if (subscription.status === "ACTIVE") {
      await db.subscription.update({ where: { id: subscription.id }, data: { status: "EXPIRED" } });
    }
    if (vendor?.isPublished) {
      await db.vendorProfile.update({ where: { id: vendor.id }, data: { isPublished: false } });
    }
    if (banquet?.isPublished) {
      await db.banquetProfile.update({ where: { id: banquet.id }, data: { isPublished: false } });
    }
    return;
  }

  // Active/unexpired period — republish, but only if there's an actual
  // captured payment on this subscription (never-paid is otherwise
  // indistinguishable from "renewed after expiring": both look like
  // "not expired, not published") and the profile wasn't hidden for an
  // unrelated reason like an admin KYC rejection.
  if (!vendor?.isPublished || !banquet?.isPublished) {
    const paid = await db.payment.findFirst({
      where: { subscriptionId: subscription.id, status: "CAPTURED" },
      select: { id: true },
    });
    if (paid) {
      if (vendor && !vendor.isPublished && vendor.kycStatus === "APPROVED") {
        await db.vendorProfile.update({
          where: { id: vendor.id },
          data: { isPublished: true, publishedAt: new Date() },
        });
      }
      if (banquet && !banquet.isPublished && banquet.kycStatus === "APPROVED") {
        await db.banquetProfile.update({
          where: { id: banquet.id },
          data: { isPublished: true, publishedAt: new Date() },
        });
      }
    }
  }
}

/** Bulk sweep for the cron job / admin "run now" action — catches listings
 * nobody has visited recently, so the public site stays correct even for
 * profiles with no fresh traffic. */
export async function expireOverdueSubscriptions(): Promise<number> {
  const overdue = await db.subscription.findMany({
    where: { status: "ACTIVE", currentPeriodEnd: { lt: new Date() } },
    select: { userId: true },
  });
  for (const { userId } of overdue) {
    await syncPublishStatusForUser(userId);
  }
  return overdue.length;
}
