"use server";

import { requireOwnership, requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import type { ActionResult } from "@/server/actions/auth";
import { findBookingById } from "@/server/repositories/booking";
import { initiateBookingPayment, initiateSubscriptionPayment } from "@/server/services/payment";

export type CheckoutOrder = { orderId: string; amountPaise: number; keyId: string };

export async function initiateBookingPaymentAction(
  bookingId: string,
): Promise<ActionResult<CheckoutOrder>> {
  const booking = await findBookingById(bookingId);
  if (!booking) return { ok: false, error: "Booking not found." };
  await requireOwnership(booking.customerId);

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

export async function initiateSubscriptionPaymentAction(
  subscriptionId: string,
): Promise<ActionResult<CheckoutOrder>> {
  const session = await requireRole(["CUSTOMER", "VENDOR", "BANQUET_OWNER"]);

  const subscription = await db.subscription.findUnique({ where: { id: subscriptionId } });
  if (!subscription || subscription.userId !== session.user.id) {
    return { ok: false, error: "Subscription not found." };
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
