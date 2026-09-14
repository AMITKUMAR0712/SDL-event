"use server";

import { requireOwnership, requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/server/actions/auth";
import { findBookingById } from "@/server/repositories/booking";
import {
  capturePayment,
  initiateBookingPayment,
  initiateSubscriptionPayment,
} from "@/server/services/payment";
import { verifyCheckoutSignature } from "@/server/services/razorpay";

export type CheckoutOrder = { orderId: string; amountPaise: number; keyId: string };

export async function initiateBookingPaymentAction(
  bookingId: string,
): Promise<ActionResult<CheckoutOrder>> {
  const booking = await findBookingById(bookingId);
  if (!booking) return { ok: false, error: "Booking not found." };
  const session = await requireOwnership(booking.customerId);

  const limit = await rateLimit(`payment-initiate:${session.user.id}`, 20, 60 * 60);
  if (!limit.allowed) {
    return { ok: false, error: "Too many payment attempts. Try again later." };
  }

  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    return { ok: false, error: "Payments aren't configured on this environment yet." };
  }

  const result = await initiateBookingPayment(bookingId, env.RAZORPAY_KEY_ID);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === "ALREADY_PAID" ? "This booking is already paid." : "Booking not found.",
    };
  }
  return {
    ok: true,
    data: { orderId: result.orderId, amountPaise: result.amountPaise, keyId: result.keyId },
  };
}

/**
 * Called from the browser right after Razorpay Checkout's `handler` fires —
 * an optimistic fast path so the customer sees "Confirmed" immediately
 * instead of waiting on webhook delivery lag. The webhook
 * (`/api/webhooks/razorpay`) remains the authoritative path and will reach
 * the same state even if this call never happens (network drop, tab closed
 * mid-redirect); `capturePayment` is idempotent, so whichever arrives first
 * does the work.
 */
export async function verifyBookingPaymentAction(
  bookingId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): Promise<ActionResult> {
  const booking = await findBookingById(bookingId);
  if (!booking) return { ok: false, error: "Booking not found." };
  await requireOwnership(booking.customerId);

  const payment = await db.payment.findFirst({
    where: { bookingId, providerOrderId: razorpayOrderId },
  });
  if (!payment) return { ok: false, error: "No matching payment order for this booking." };

  const valid = verifyCheckoutSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!valid) return { ok: false, error: "Payment verification failed." };

  await capturePayment(razorpayOrderId, razorpayPaymentId, {
    source: "client-verify",
    razorpayOrderId,
    razorpayPaymentId,
  });

  return { ok: true, data: undefined };
}

export async function initiateSubscriptionPaymentAction(
  subscriptionId: string,
): Promise<ActionResult<CheckoutOrder>> {
  const session = await requireRole(["CUSTOMER", "VENDOR", "BANQUET_OWNER"]);

  const subscription = await db.subscription.findUnique({ where: { id: subscriptionId } });
  if (!subscription || subscription.userId !== session.user.id) {
    return { ok: false, error: "Subscription not found." };
  }

  const limit = await rateLimit(`payment-initiate:${session.user.id}`, 20, 60 * 60);
  if (!limit.allowed) {
    return { ok: false, error: "Too many payment attempts. Try again later." };
  }

  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    return { ok: false, error: "Payments aren't configured on this environment yet." };
  }

  const result = await initiateSubscriptionPayment(subscriptionId, env.RAZORPAY_KEY_ID);
  if (!result.ok) return { ok: false, error: "Subscription not found." };
  return {
    ok: true,
    data: { orderId: result.orderId, amountPaise: result.amountPaise, keyId: result.keyId },
  };
}

/** Same optimistic-verify pattern as verifyBookingPaymentAction, for subscription orders. */
export async function verifySubscriptionPaymentAction(
  subscriptionId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): Promise<ActionResult> {
  const session = await requireRole(["CUSTOMER", "VENDOR", "BANQUET_OWNER"]);

  const subscription = await db.subscription.findUnique({ where: { id: subscriptionId } });
  if (!subscription || subscription.userId !== session.user.id) {
    return { ok: false, error: "Subscription not found." };
  }

  const payment = await db.payment.findFirst({
    where: { subscriptionId, providerOrderId: razorpayOrderId },
  });
  if (!payment) return { ok: false, error: "No matching payment order for this subscription." };

  const valid = verifyCheckoutSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!valid) return { ok: false, error: "Payment verification failed." };

  await capturePayment(razorpayOrderId, razorpayPaymentId, {
    source: "client-verify",
    razorpayOrderId,
    razorpayPaymentId,
  });

  return { ok: true, data: undefined };
}
