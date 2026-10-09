"use server";

import { requireOwnership, requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/server/actions/auth";
import { findBookingById } from "@/server/repositories/booking";
import { isCashfreeOrderPaid } from "@/server/services/cashfree";
import {
  capturePayment,
  initiateBookingPayment,
  InitiatePaymentResult,
  initiateSubscriptionPayment,
} from "@/server/services/payment";

export type CheckoutOrder = {
  orderId: string;
  amountPaise: number;
  paymentSessionId: string;
  mode: "sandbox" | "production";
};

function paymentInitiateErrorMessage(
  reason: Exclude<InitiatePaymentResult, { ok: true }>["reason"],
  entityLabel: "Booking" | "Subscription",
): string {
  switch (reason) {
    case "ALREADY_PAID":
      return `This ${entityLabel.toLowerCase()} is already paid.`;
    case "INVALID_AMOUNT":
      return "The amount is below the minimum allowed for payment.";
    case "PROVIDER_ERROR":
      return "Payment couldn't be started right now. Please try again shortly.";
    case "PHONE_REQUIRED":
      return "Add a phone number to your account before paying.";
    default:
      return `${entityLabel} not found.`;
  }
}

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

  if (!env.CASHFREE_APP_ID || !env.CASHFREE_SECRET_KEY) {
    return { ok: false, error: "Payments aren't configured on this environment yet." };
  }

  const result = await initiateBookingPayment(bookingId);
  if (!result.ok) {
    return { ok: false, error: paymentInitiateErrorMessage(result.reason, "Booking") };
  }
  return {
    ok: true,
    data: {
      orderId: result.orderId,
      amountPaise: result.amountPaise,
      paymentSessionId: result.paymentSessionId,
      mode: env.CASHFREE_ENV === "PRODUCTION" ? "production" : "sandbox",
    },
  };
}

/**
 * Called from the browser right after Cashfree Checkout's modal closes —
 * an optimistic fast path so the customer sees "Confirmed" immediately
 * instead of waiting on webhook delivery lag. Unlike Razorpay, Cashfree's
 * checkout doesn't hand the browser a verifiable payment+signature pair, so
 * this confirms the order's real status with a server-to-server Cashfree
 * call instead of checking a signature. The webhook
 * (`/api/webhooks/cashfree`) remains the authoritative path and will reach
 * the same state even if this call never happens (network drop, tab closed
 * mid-checkout); `capturePayment` is idempotent, so whichever arrives first
 * does the work.
 */
export async function verifyBookingPaymentAction(
  bookingId: string,
  orderId: string,
): Promise<ActionResult> {
  const booking = await findBookingById(bookingId);
  if (!booking) return { ok: false, error: "Booking not found." };
  await requireOwnership(booking.customerId);

  const payment = await db.payment.findFirst({ where: { bookingId, providerOrderId: orderId } });
  if (!payment) return { ok: false, error: "No matching payment order for this booking." };

  const status = await isCashfreeOrderPaid(orderId);
  if (!status.paid) return { ok: false, error: "Payment not completed yet." };

  await capturePayment(orderId, status.cfPaymentId, { source: "client-verify", orderId });

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

  if (!env.CASHFREE_APP_ID || !env.CASHFREE_SECRET_KEY) {
    return { ok: false, error: "Payments aren't configured on this environment yet." };
  }

  const result = await initiateSubscriptionPayment(subscriptionId);
  if (!result.ok) {
    return { ok: false, error: paymentInitiateErrorMessage(result.reason, "Subscription") };
  }
  return {
    ok: true,
    data: {
      orderId: result.orderId,
      amountPaise: result.amountPaise,
      paymentSessionId: result.paymentSessionId,
      mode: env.CASHFREE_ENV === "PRODUCTION" ? "production" : "sandbox",
    },
  };
}

/** Same optimistic-verify pattern as verifyBookingPaymentAction, for subscription orders. */
export async function verifySubscriptionPaymentAction(
  subscriptionId: string,
  orderId: string,
): Promise<ActionResult> {
  const session = await requireRole(["CUSTOMER", "VENDOR", "BANQUET_OWNER"]);

  const subscription = await db.subscription.findUnique({ where: { id: subscriptionId } });
  if (!subscription || subscription.userId !== session.user.id) {
    return { ok: false, error: "Subscription not found." };
  }

  const payment = await db.payment.findFirst({
    where: { subscriptionId, providerOrderId: orderId },
  });
  if (!payment) return { ok: false, error: "No matching payment order for this subscription." };

  const status = await isCashfreeOrderPaid(orderId);
  if (!status.paid) return { ok: false, error: "Payment not completed yet." };

  await capturePayment(orderId, status.cfPaymentId, { source: "client-verify", orderId });

  return { ok: true, data: undefined };
}
