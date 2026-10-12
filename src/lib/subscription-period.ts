import type { BillingPeriod } from "@prisma/client";

const BILLING_PERIOD_DAYS: Record<BillingPeriod, number> = {
  MONTHLY: 30,
  QUARTERLY: 90,
  HALF_YEARLY: 182,
  YEARLY: 365,
};

export function addBillingPeriod(start: Date, billingPeriod: BillingPeriod): Date {
  return new Date(start.getTime() + BILLING_PERIOD_DAYS[billingPeriod] * 24 * 60 * 60 * 1000);
}

export function getNextSubscriptionPeriodEnd(
  billingPeriod: BillingPeriod,
  currentPeriodEnd: Date,
  hasPriorPaidPeriod: boolean,
  now: Date,
): Date {
  const startsAt = hasPriorPaidPeriod && currentPeriodEnd > now ? currentPeriodEnd : now;
  return addBillingPeriod(startsAt, billingPeriod);
}
