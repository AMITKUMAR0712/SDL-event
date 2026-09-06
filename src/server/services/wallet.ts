import type { ProfileOwnerType } from "@prisma/client";

import { db } from "@/lib/db";

async function latestBalance(ownerType: ProfileOwnerType, ownerId: string): Promise<number> {
  const last = await db.walletTransaction.findFirst({
    where: { ownerType, ownerId },
    orderBy: { createdAt: "desc" },
    select: { balanceAfterPaise: true },
  });
  return last?.balanceAfterPaise ?? 0;
}

/**
 * Credits the owner's wallet with their earnings (total minus commission)
 * when a booking completes. Append-only — never updates a prior row, only
 * ever inserts a new one carrying the running balance forward.
 */
export async function creditBookingEarning(booking: {
  id: string;
  ownerType: ProfileOwnerType;
  ownerId: string;
  totalPaise: number;
  commissionPaise: number;
  discountPaise: number;
}) {
  const payoutPaise = booking.totalPaise - booking.commissionPaise - booking.discountPaise;
  const balanceBefore = await latestBalance(booking.ownerType, booking.ownerId);
  const balanceAfter = balanceBefore + payoutPaise;

  await db.$transaction([
    db.walletTransaction.create({
      data: {
        ownerType: booking.ownerType,
        ownerId: booking.ownerId,
        type: "BOOKING_EARNING",
        amountPaise: payoutPaise,
        bookingId: booking.id,
        balanceAfterPaise: balanceAfter,
        description: `Earnings for booking`,
      },
    }),
    db.booking.update({ where: { id: booking.id }, data: { payoutPaise } }),
  ]);
}

export async function getWalletBalance(
  ownerType: ProfileOwnerType,
  ownerId: string,
): Promise<number> {
  return latestBalance(ownerType, ownerId);
}

/** Reconciliation check: SUM(amountPaise) for the owner must equal the latest balanceAfterPaise. */
export async function reconcileWallet(
  ownerType: ProfileOwnerType,
  ownerId: string,
): Promise<boolean> {
  const [sum, latest] = await Promise.all([
    db.walletTransaction.aggregate({
      where: { ownerType, ownerId },
      _sum: { amountPaise: true },
    }),
    latestBalance(ownerType, ownerId),
  ]);
  return (sum._sum.amountPaise ?? 0) === latest;
}
