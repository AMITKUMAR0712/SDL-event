import { describe, expect, it } from "vitest";

import {
  allowedNextStatuses,
  canTransition,
  refundPercentFor,
} from "@/server/services/booking-status";

describe("canTransition", () => {
  it("allows the owner to confirm a pending booking", () => {
    expect(canTransition("PENDING", "CONFIRMED", "OWNER")).toBe(true);
  });

  it("does not allow a customer to confirm a booking", () => {
    expect(canTransition("PENDING", "CONFIRMED", "CUSTOMER")).toBe(false);
  });

  it("allows both customer and owner to cancel a pending booking", () => {
    expect(canTransition("PENDING", "CANCELLED", "CUSTOMER")).toBe(true);
    expect(canTransition("PENDING", "CANCELLED", "OWNER")).toBe(true);
  });

  it("does not allow skipping straight from PENDING to COMPLETED", () => {
    expect(canTransition("PENDING", "COMPLETED", "OWNER")).toBe(false);
  });

  it("does not allow transitions out of a terminal COMPLETED state except admin refund", () => {
    expect(canTransition("COMPLETED", "CONFIRMED", "OWNER")).toBe(false);
    expect(canTransition("COMPLETED", "REFUNDED", "ADMIN")).toBe(true);
  });

  it("lets admin force any non-identity transition", () => {
    expect(canTransition("PENDING", "COMPLETED", "ADMIN")).toBe(true);
    expect(canTransition("PENDING", "PENDING", "ADMIN")).toBe(false);
  });
});

describe("allowedNextStatuses", () => {
  it("lists exactly the owner's legal next statuses from CONFIRMED", () => {
    expect(allowedNextStatuses("CONFIRMED", "OWNER").sort()).toEqual(
      ["CANCELLED", "IN_PROGRESS", "NO_SHOW"].sort(),
    );
  });
});

describe("refundPercentFor", () => {
  const policy = {
    fullRefundBeforeHours: 24,
    partialRefundPercent: 50,
    partialRefundBeforeHours: 4,
  };
  const scheduledAt = new Date("2026-01-10T12:00:00Z");

  it("gives a full refund when cancelled well ahead of the appointment", () => {
    const now = new Date("2026-01-08T12:00:00Z"); // 48h before
    expect(refundPercentFor(scheduledAt, now, policy)).toBe(100);
  });

  it("gives a partial refund within the partial window", () => {
    const now = new Date("2026-01-10T02:00:00Z"); // 10h before
    expect(refundPercentFor(scheduledAt, now, policy)).toBe(50);
  });

  it("gives no refund inside the no-refund window", () => {
    const now = new Date("2026-01-10T10:00:00Z"); // 2h before
    expect(refundPercentFor(scheduledAt, now, policy)).toBe(0);
  });
});
