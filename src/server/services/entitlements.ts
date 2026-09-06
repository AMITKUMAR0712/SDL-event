import { db } from "@/lib/db";

/** Start of the current billing-cycle "period" a feature's usage counter resets on: calendar month. */
function currentPeriodStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

async function getActiveFeatureValue(userId: string, featureKey: string) {
  const subscription = await db.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    include: { plan: { include: { features: true } } },
    orderBy: { currentPeriodEnd: "desc" },
  });
  if (!subscription) return null;

  const feature = subscription.plan.features.find((f) => f.key === featureKey);
  return { subscription, feature };
}

/** Whether `userId` currently has `featureKey` enabled/available at all (boolean or nonzero-limit features). */
export async function can(userId: string, featureKey: string): Promise<boolean> {
  const result = await getActiveFeatureValue(userId, featureKey);
  if (!result?.feature) return false;
  if (result.feature.valueBool !== null) return result.feature.valueBool;
  if (result.feature.valueInt !== null) return result.feature.valueInt > 0;
  return true;
}

export type ConsumeResult =
  { ok: true; remaining: number } | { ok: false; reason: "NO_ACCESS" | "LIMIT_REACHED" };

/** Consumes one unit of a count-limited feature (e.g. LEADS_PER_MONTH), resetting on the calendar month. */
export async function consume(userId: string, featureKey: string): Promise<ConsumeResult> {
  const result = await getActiveFeatureValue(userId, featureKey);
  if (!result?.feature || result.feature.valueInt === null)
    return { ok: false, reason: "NO_ACCESS" };

  const periodStart = currentPeriodStart();
  const usage = await db.featureUsage.upsert({
    where: {
      subscriptionId_featureKey_periodStart: {
        subscriptionId: result.subscription.id,
        featureKey,
        periodStart,
      },
    },
    create: {
      subscriptionId: result.subscription.id,
      featureKey,
      periodStart,
      used: 0,
      limit: result.feature.valueInt,
    },
    update: {},
  });

  if (usage.used >= usage.limit) return { ok: false, reason: "LIMIT_REACHED" };

  const updated = await db.featureUsage.update({
    where: { id: usage.id },
    data: { used: { increment: 1 } },
  });

  return { ok: true, remaining: updated.limit - updated.used };
}
