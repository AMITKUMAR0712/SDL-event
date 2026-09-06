import crypto from "node:crypto";

import { db } from "@/lib/db";
import { findBookingById } from "@/server/repositories/booking";
import { createRazorpayOrder } from "@/server/services/razorpay";

export type InitiatePaymentResult =
  | { ok: true; orderId: string; amountPaise: number; keyId: string }
  | { ok: false; reason: "BOOKING_NOT_FOUND" | "ALREADY_PAID" };

/**
 * NB: this is a one-time-payment-per-booking flow, not Razorpay's recurring
 * Subscriptions entity. `initiateSubscriptionPayment` below is deliberately
 * the same shape (a one-off Order per billing period) rather than the full
 * Razorpay Subscriptions API with auto-debit mandates, proration, and
 * dunning — that's a materially larger integration that needs real
 * production traffic to get right, and is called out as a scoped-down piece
 * in docs/CHANGELOG.md rather than half-built here.
 */
export async function initiateBookingPayment(
  bookingId: string,
  keyId: string,
): Promise<InitiatePaymentResult> {
  const booking = await findBookingById(bookingId);
  if (!booking) return { ok: false, reason: "BOOKING_NOT_FOUND" };

  const existingCaptured = await db.payment.findFirst({
    where: { bookingId, status: "CAPTURED" },
  });
  if (existingCaptured) return { ok: false, reason: "ALREADY_PAID" };

  const order = await createRazorpayOrder(booking.totalPaise, booking.bookingNo);

  await db.payment.create({
    data: {
      bookingId,
      providerOrderId: order.id,
      amountPaise: booking.totalPaise,
      idempotencyKey: crypto.randomUUID(),
    },
  });

  return { ok: true, orderId: order.id, amountPaise: booking.totalPaise, keyId };
}

export async function initiateSubscriptionPayment(
  subscriptionId: string,
  keyId: string,
): Promise<InitiatePaymentResult> {
  const subscription = await db.subscription.findUnique({ where: { id: subscriptionId } });
  if (!subscription) return { ok: false, reason: "BOOKING_NOT_FOUND" };

  const order = await createRazorpayOrder(subscription.priceSnapshotPaise, subscriptionId);

  await db.payment.create({
    data: {
      subscriptionId,
      providerOrderId: order.id,
      amountPaise: subscription.priceSnapshotPaise,
      idempotencyKey: crypto.randomUUID(),
    },
  });

  return { ok: true, orderId: order.id, amountPaise: subscription.priceSnapshotPaise, keyId };
}
