import { describe, expect, it } from "vitest";

import { addBillingPeriod, getNextSubscriptionPeriodEnd } from "@/lib/subscription-period";

describe("addBillingPeriod", () => {
  const start = new Date("2026-10-12T12:00:00.000Z");

  it.each([
    ["MONTHLY", 30],
    ["QUARTERLY", 90],
    ["HALF_YEARLY", 182],
    ["YEARLY", 365],
  ] as const)("adds the configured number of days for %s", (billingPeriod, days) => {
    expect(addBillingPeriod(start, billingPeriod).getTime()).toBe(
      start.getTime() + days * 24 * 60 * 60 * 1000,
    );
  });

  it("starts a first paid term on the payment date, not a future trial end", () => {
    const futureTrialEnd = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

    expect(getNextSubscriptionPeriodEnd("QUARTERLY", futureTrialEnd, false, start)).toEqual(
      addBillingPeriod(start, "QUARTERLY"),
    );
  });

  it("preserves the remaining paid term when renewed early", () => {
    const remainingPeriod = new Date(start.getTime() + 10 * 24 * 60 * 60 * 1000);

    expect(getNextSubscriptionPeriodEnd("HALF_YEARLY", remainingPeriod, true, start)).toEqual(
      addBillingPeriod(remainingPeriod, "HALF_YEARLY"),
    );
  });

  it("starts a new term now when the prior paid term has expired", () => {
    const expiredPeriod = new Date(start.getTime() - 1);

    expect(getNextSubscriptionPeriodEnd("YEARLY", expiredPeriod, true, start)).toEqual(
      addBillingPeriod(start, "YEARLY"),
    );
  });
});
