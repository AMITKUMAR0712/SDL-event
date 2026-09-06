import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { getWalletBalance, reconcileWallet } from "@/server/services/wallet";

describe("wallet ledger reconciliation (integration, hits the real dev DB)", () => {
  const ownerId = `wallet-test-owner-${Date.now()}`;

  afterAll(async () => {
    await db.walletTransaction.deleteMany({ where: { ownerId } });
    await db.$disconnect();
  });

  it("keeps SUM(amountPaise) equal to the latest balanceAfterPaise across several entries", async () => {
    const entries = [10_000, -2_000, 5_000, -1_500];
    let running = 0;

    for (const amount of entries) {
      running += amount;
      await db.walletTransaction.create({
        data: {
          ownerType: "VENDOR",
          ownerId,
          type: amount >= 0 ? "BOOKING_EARNING" : "PAYOUT",
          amountPaise: amount,
          balanceAfterPaise: running,
        },
      });
    }

    const balance = await getWalletBalance("VENDOR", ownerId);
    expect(balance).toBe(running);

    const reconciled = await reconcileWallet("VENDOR", ownerId);
    expect(reconciled).toBe(true);
  });

  it("detects a broken ledger (a corrupted balanceAfterPaise) as not reconciled", async () => {
    const brokenOwnerId = `${ownerId}-broken`;
    await db.walletTransaction.create({
      data: {
        ownerType: "VENDOR",
        ownerId: brokenOwnerId,
        type: "BOOKING_EARNING",
        amountPaise: 10_000,
        balanceAfterPaise: 999_999, // deliberately wrong
      },
    });

    const reconciled = await reconcileWallet("VENDOR", brokenOwnerId);
    expect(reconciled).toBe(false);

    await db.walletTransaction.deleteMany({ where: { ownerId: brokenOwnerId } });
  });
});
