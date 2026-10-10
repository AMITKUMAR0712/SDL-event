import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/repositories/payment", () => ({
  findCapturedSubscriptionPayment: vi.fn(),
}));

import { findCapturedSubscriptionPayment } from "@/server/repositories/payment";
import { getSubscriptionPaymentConfirmation } from "@/server/services/payment";

const findCapturedPaymentMock = vi.mocked(findCapturedSubscriptionPayment);

describe("getSubscriptionPaymentConfirmation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns the server-stored amount for the subscription owner", async () => {
    findCapturedPaymentMock.mockResolvedValue({
      id: "payment-1",
      providerPaymentId: "cf-payment-1",
      amountPaise: 12_345,
      subscription: { userId: "user-1" },
    });

    await expect(getSubscriptionPaymentConfirmation("payment-1", "user-1")).resolves.toEqual({
      paymentId: "payment-1",
      amountPaise: 12_345,
    });
  });

  it("does not confirm payments that are missing or belong to another user", async () => {
    findCapturedPaymentMock.mockResolvedValue({
      id: "payment-1",
      providerPaymentId: "cf-payment-1",
      amountPaise: 12_345,
      subscription: { userId: "another-user" },
    });
    await expect(getSubscriptionPaymentConfirmation("payment-1", "user-1")).resolves.toBeNull();

    findCapturedPaymentMock.mockResolvedValue(null);
    await expect(getSubscriptionPaymentConfirmation("payment-1", "user-1")).resolves.toBeNull();
  });
});
