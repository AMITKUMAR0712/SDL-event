import crypto from "node:crypto";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { findBookingById } from "@/server/repositories/booking";
import { transitionBooking } from "@/server/services/booking";
import { createCashfreeOrder } from "@/server/services/cashfree";
import { syncPublishStatusForUser } from "@/server/services/subscription";

export type InitiatePaymentResult =
  | { ok: true; orderId: string; amountPaise: number; paymentSessionId: string }
  | {
      ok: false;
      reason:
        | "BOOKING_NOT_FOUND"
        | "ALREADY_PAID"
        | "INVALID_AMOUNT"
        | "PROVIDER_ERROR"
        | "PHONE_REQUIRED";
    };

/** Amount-too-low is a distinct, expected failure (surfaced to the caller
 * as a clean reason code); anything else from the Cashfree API/SDK is an
 * unexpected provider error, logged and reported generically rather than
 * leaking SDK internals to the client. */
async function tryCreateOrder(
  amountPaise: number,
  receipt: string,
  customerId: string,
  customerPhone: string,
): Promise<
  | { ok: true; orderId: string; paymentSessionId: string }
  | { ok: false; reason: "INVALID_AMOUNT" | "PROVIDER_ERROR" }
> {
  if (amountPaise < 100) return { ok: false, reason: "INVALID_AMOUNT" };
  try {
    const order = await createCashfreeOrder(amountPaise, receipt, customerId, customerPhone);
    return { ok: true, orderId: order.orderId, paymentSessionId: order.paymentSessionId };
  } catch (error) {
    logger.error("[cashfree] order creation failed", { error, amountPaise, receipt });
    return { ok: false, reason: "PROVIDER_ERROR" };
  }
}

/**
 * NB: this is a one-time-payment-per-booking flow, not Cashfree's recurring
 * Subscriptions entity. `initiateSubscriptionPayment` below is deliberately
 * the same shape (a one-off Order per billing period) rather than a full
 * recurring-mandate integration with auto-debit, proration, and dunning —
 * that's a materially larger integration that needs real production traffic
 * to get right, and is called out as a scoped-down piece in
 * docs/CHANGELOG.md rather than half-built here.
 */
export async function initiateBookingPayment(bookingId: string): Promise<InitiatePaymentResult> {
  const booking = await findBookingById(bookingId);
  if (!booking) return { ok: false, reason: "BOOKING_NOT_FOUND" };
  if (!booking.contactPhone) return { ok: false, reason: "PHONE_REQUIRED" };

  const existingCaptured = await db.payment.findFirst({
    where: { bookingId, status: "CAPTURED" },
  });
  if (existingCaptured) return { ok: false, reason: "ALREADY_PAID" };

  const order = await tryCreateOrder(
    booking.totalPaise,
    booking.bookingNo,
    booking.customerId,
    booking.contactPhone,
  );
  if (!order.ok) return order;

  await db.payment.create({
    data: {
      bookingId,
      provider: "CASHFREE",
      providerOrderId: order.orderId,
      amountPaise: booking.totalPaise,
      idempotencyKey: crypto.randomUUID(),
    },
  });

  return {
    ok: true,
    orderId: order.orderId,
    amountPaise: booking.totalPaise,
    paymentSessionId: order.paymentSessionId,
  };
}

export async function initiateSubscriptionPayment(
  subscriptionId: string,
): Promise<InitiatePaymentResult> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { user: { select: { phone: true } } },
  });
  if (!subscription) return { ok: false, reason: "BOOKING_NOT_FOUND" };
  if (!subscription.user.phone) return { ok: false, reason: "PHONE_REQUIRED" };

  const order = await tryCreateOrder(
    subscription.priceSnapshotPaise,
    subscriptionId,
    subscription.userId,
    subscription.user.phone,
  );
  if (!order.ok) return order;

  await db.payment.create({
    data: {
      subscriptionId,
      provider: "CASHFREE",
      providerOrderId: order.orderId,
      amountPaise: subscription.priceSnapshotPaise,
      idempotencyKey: crypto.randomUUID(),
    },
  });

  return {
    ok: true,
    orderId: order.orderId,
    amountPaise: subscription.priceSnapshotPaise,
    paymentSessionId: order.paymentSessionId,
  };
}

/**
 * Applies a captured payment's effects — shared by the Cashfree webhook (the
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
