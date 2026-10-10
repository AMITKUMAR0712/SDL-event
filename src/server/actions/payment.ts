"use server";

import { z } from "zod";

import { requireOwnership, requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/server/actions/auth";
import { findBookingById } from "@/server/repositories/booking";
import {
  initiateBookingPayment,
  InitiatePaymentResult,
  initiateSubscriptionPayment,
} from "@/server/services/payment";

export type CheckoutOrder = {
  orderId: string;
  amountPaise: number;
  checkoutUrl: string;
  fields: Record<string, string>;
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
  checkoutEmail: string,
): Promise<ActionResult<CheckoutOrder>> {
  const parsedEmail = z.string().email().safeParse(checkoutEmail);
  if (!parsedEmail.success) return { ok: false, error: "Enter a valid email for this payment." };

  const booking = await findBookingById(bookingId);
  if (!booking) return { ok: false, error: "Booking not found." };
  const session = await requireOwnership(booking.customerId);

  const limit = await rateLimit(`payment-initiate:${session.user.id}`, 20, 60 * 60);
  if (!limit.allowed) {
    return { ok: false, error: "Too many payment attempts. Try again later." };
  }

  if (!env.PAYU_KEY || !env.PAYU_SALT) {
    return { ok: false, error: "Payments aren't configured on this environment yet." };
  }

  const result = await initiateBookingPayment(bookingId, parsedEmail.data);
  if (!result.ok) {
    return { ok: false, error: paymentInitiateErrorMessage(result.reason, "Booking") };
  }
  return {
    ok: true,
    data: {
      orderId: result.orderId,
      amountPaise: result.amountPaise,
      checkoutUrl: result.checkout.url,
      fields: result.checkout.fields,
    },
  };
}

export async function initiateSubscriptionPaymentAction(
  subscriptionId: string,
  checkoutEmail: string,
): Promise<ActionResult<CheckoutOrder>> {
  const parsedEmail = z.string().email().safeParse(checkoutEmail);
  if (!parsedEmail.success) return { ok: false, error: "Enter a valid email for this payment." };

  const session = await requireRole(["CUSTOMER", "VENDOR", "BANQUET_OWNER"]);

  const subscription = await db.subscription.findUnique({ where: { id: subscriptionId } });
  if (!subscription || subscription.userId !== session.user.id) {
    return { ok: false, error: "Subscription not found." };
  }

  const limit = await rateLimit(`payment-initiate:${session.user.id}`, 20, 60 * 60);
  if (!limit.allowed) {
    return { ok: false, error: "Too many payment attempts. Try again later." };
  }

  if (!env.PAYU_KEY || !env.PAYU_SALT) {
    return { ok: false, error: "Payments aren't configured on this environment yet." };
  }

  const result = await initiateSubscriptionPayment(subscriptionId, parsedEmail.data);
  if (!result.ok) {
    return { ok: false, error: paymentInitiateErrorMessage(result.reason, "Subscription") };
  }
  return {
    ok: true,
    data: {
      orderId: result.orderId,
      amountPaise: result.amountPaise,
      checkoutUrl: result.checkout.url,
      fields: result.checkout.fields,
    },
  };
}
