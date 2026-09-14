import crypto from "node:crypto";

import { db } from "@/lib/db";
import { findBookingById } from "@/server/repositories/booking";
import { transitionBooking } from "@/server/services/booking";
import { createRazorpayOrder } from "@/server/services/razorpay";
import { syncPublishStatusForUser } from "@/server/services/subscription";

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

/**
 * Applies a captured payment's effects — shared by the Razorpay webhook (the
 * authoritative path, always processed eventually) and the client-side
 * post-checkout verification call (an optimistic fast path so the customer
 * isn't stuck waiting on webhook delivery lag). Idempotent by construction:
 * whichever caller arrives first does the work, the other is a no-op because
 * `payment.status` is already `CAPTURED`.
 */
export async function capturePayment(
  providerOrderId: string,
  providerPaymentId: string,
  rawPayload: unknown,
): Promise<void> {
  const payment = await db.payment.findFirst({ where: { providerOrderId } });
  if (!payment || payment.status === "CAPTURED") return;

  await db.payment.update({
    where: { id: payment.id },
    data: { status: "CAPTURED", providerPaymentId, rawPayload: rawPayload as object },
  });

  if (payment.bookingId) {
    await transitionBooking(payment.bookingId, "CONFIRMED", "OWNER");
  } else if (payment.subscriptionId) {
    const subscription = await db.subscription.findUnique({
      where: { id: payment.subscriptionId },
      include: { plan: true },
    });
    if (subscription) {
      const periodDays =
        subscription.plan.billingPeriod === "MONTHLY"
          ? 30
          : subscription.plan.billingPeriod === "QUARTERLY"
            ? 90
            : subscription.plan.billingPeriod === "HALF_YEARLY"
              ? 182
              : 365;
      await db.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "ACTIVE",
          currentPeriodEnd: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000),
        },
      });
      // Re-publish immediately if this payment renewed a lapsed plan —
      // don't make the vendor/banquet wait for their next dashboard visit.
      await syncPublishStatusForUser(subscription.userId);
    }
  }
}
