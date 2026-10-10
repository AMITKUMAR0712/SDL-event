import crypto from "node:crypto";

import type { PaymentProvider } from "@prisma/client";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { findBookingById } from "@/server/repositories/booking";
import { findCapturedSubscriptionPayment } from "@/server/repositories/payment";
import { transitionBooking } from "@/server/services/booking";
import { createPayUCheckout, type PayUCheckout } from "@/server/services/payu";
import { syncPublishStatusForUser } from "@/server/services/subscription";

export type InitiatePaymentResult =
  | { ok: true; orderId: string; amountPaise: number; checkout: PayUCheckout }
  | {
      ok: false;
      reason:
        | "BOOKING_NOT_FOUND"
        | "ALREADY_PAID"
        | "INVALID_AMOUNT"
        | "PROVIDER_ERROR"
        | "PHONE_REQUIRED";
    };

export async function getSubscriptionPaymentConfirmation(paymentId: string, userId: string) {
  const payment = await findCapturedSubscriptionPayment(paymentId);
  if (!payment || payment.subscription?.userId !== userId) return null;

  return { paymentId: payment.id, amountPaise: payment.amountPaise };
}

/** PayU checkout fields are signed on the server; only the signed form is sent to the browser. */
function tryCreateOrder(
  amountPaise: number,
  txnId: string,
  productInfo: string,
  customerName: string | null,
  customerEmail: string,
  customerPhone: string,
):
  | { ok: true; orderId: string; checkout: PayUCheckout }
  | { ok: false; reason: "INVALID_AMOUNT" | "PROVIDER_ERROR" } {
  if (!Number.isSafeInteger(amountPaise) || amountPaise < 100) {
    return { ok: false, reason: "INVALID_AMOUNT" };
  }
  try {
    const checkout = createPayUCheckout({
      txnId,
      amountPaise,
      productInfo,
      firstName: customerName?.trim().split(/\s+/)[0] || "Customer",
      email: customerEmail,
      phone: customerPhone,
    });
    return { ok: true, orderId: txnId, checkout };
  } catch (error) {
    logger.error("[payu] checkout creation failed", { error, amountPaise, txnId });
    return { ok: false, reason: "PROVIDER_ERROR" };
  }
}

/**
 * NB: this is a one-time-payment-per-booking flow, not a recurring
 * subscription mandate. `initiateSubscriptionPayment` below is deliberately
 * the same shape (a one-off Order per billing period) rather than a full
 * recurring-mandate integration with auto-debit, proration, and dunning —
 * that's a materially larger integration that needs real production traffic
 * to get right, and is called out as a scoped-down piece in
 * docs/CHANGELOG.md rather than half-built here.
 */
export async function initiateBookingPayment(
  bookingId: string,
  checkoutEmail: string,
): Promise<InitiatePaymentResult> {
  const booking = await findBookingById(bookingId);
  if (!booking) return { ok: false, reason: "BOOKING_NOT_FOUND" };
  if (!booking.contactPhone) return { ok: false, reason: "PHONE_REQUIRED" };
  const customer = await db.user.findUnique({
    where: { id: booking.customerId },
    select: { name: true },
  });
  if (!customer) return { ok: false, reason: "BOOKING_NOT_FOUND" };

  const existingCaptured = await db.payment.findFirst({
    where: { bookingId, status: "CAPTURED" },
  });
  if (existingCaptured) return { ok: false, reason: "ALREADY_PAID" };

  const txnId = crypto.randomBytes(12).toString("hex");
  const order = await tryCreateOrder(
    booking.totalPaise,
    txnId,
    `Booking ${booking.bookingNo}`,
    customer.name,
    checkoutEmail,
    booking.contactPhone,
  );
  if (!order.ok) return order;

  await db.payment.create({
    data: {
      bookingId,
      provider: "PAYU",
      providerOrderId: order.orderId,
      amountPaise: booking.totalPaise,
      idempotencyKey: crypto.randomUUID(),
    },
  });

  return {
    ok: true,
    orderId: order.orderId,
    amountPaise: booking.totalPaise,
    checkout: order.checkout,
  };
}

export async function initiateSubscriptionPayment(
  subscriptionId: string,
  checkoutEmail: string,
): Promise<InitiatePaymentResult> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { user: { select: { name: true, phone: true } } },
  });
  if (!subscription) return { ok: false, reason: "BOOKING_NOT_FOUND" };
  if (!subscription.user.phone) return { ok: false, reason: "PHONE_REQUIRED" };

  const txnId = crypto.randomBytes(12).toString("hex");
  const order = await tryCreateOrder(
    subscription.priceSnapshotPaise,
    txnId,
    `Subscription ${subscriptionId}`,
    subscription.user.name,
    checkoutEmail,
    subscription.user.phone,
  );
  if (!order.ok) return order;

  await db.payment.create({
    data: {
      subscriptionId,
      provider: "PAYU",
      providerOrderId: order.orderId,
      amountPaise: subscription.priceSnapshotPaise,
      idempotencyKey: crypto.randomUUID(),
    },
  });

  return {
    ok: true,
    orderId: order.orderId,
    amountPaise: subscription.priceSnapshotPaise,
    checkout: order.checkout,
  };
}

/**
 * Applies the effects of a payment confirmed by a provider's server-side
 * verification flow. Legacy gateway callbacks share the same capture logic.
 */
export async function capturePayment(
  provider: PaymentProvider,
  providerOrderId: string,
  providerPaymentId: string,
  rawPayload: unknown,
): Promise<void> {
  const payment = await db.payment.findFirst({ where: { provider, providerOrderId } });
  if (!payment || payment.status === "CAPTURED") return;

  const captured = await db.payment.updateMany({
    where: { id: payment.id, status: { not: "CAPTURED" } },
    data: { status: "CAPTURED", providerPaymentId, rawPayload: rawPayload as object },
  });
  if (captured.count === 0) return;

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
