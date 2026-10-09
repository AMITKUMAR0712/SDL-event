import "server-only";

import { Cashfree, CFEnvironment } from "cashfree-pg";

import { env } from "@/lib/env";

let client: Cashfree | undefined;

/** Throws if Cashfree isn't configured — every caller is inside a payment flow that requires it. */
export function getCashfreeClient(): Cashfree {
  if (!env.CASHFREE_APP_ID || !env.CASHFREE_SECRET_KEY) {
    throw new Error("Cashfree is not configured (CASHFREE_APP_ID/SECRET_KEY missing).");
  }
  client ??= new Cashfree(
    env.CASHFREE_ENV === "PRODUCTION" ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX,
    env.CASHFREE_APP_ID,
    env.CASHFREE_SECRET_KEY,
  );
  return client;
}

const MIN_AMOUNT_PAISE = 100;

export type CashfreeOrder = { orderId: string; paymentSessionId: string };

/**
 * `customerId`/`customerPhone` are required by Cashfree's create-order API
 * (used to build the payment session) — the booking/subscription's own
 * customer, not a Cashfree-specific concept.
 */
export async function createCashfreeOrder(
  amountPaise: number,
  receipt: string,
  customerId: string,
  customerPhone: string,
): Promise<CashfreeOrder> {
  if (amountPaise < MIN_AMOUNT_PAISE) {
    throw new Error(`Amount must be at least ${MIN_AMOUNT_PAISE} paise (₹1).`);
  }
  const cashfree = getCashfreeClient();
  const response = await cashfree.PGCreateOrder({
    order_id: receipt,
    order_amount: amountPaise / 100,
    order_currency: "INR",
    customer_details: {
      customer_id: customerId,
      customer_phone: customerPhone,
    },
  });

  const orderId = response.data.order_id;
  const paymentSessionId = response.data.payment_session_id;
  if (!orderId || !paymentSessionId) {
    throw new Error("Cashfree order creation did not return a payment session.");
  }
  return { orderId, paymentSessionId };
}

/** True if any payment on this order reached a terminal SUCCESS state. */
export async function isCashfreeOrderPaid(
  orderId: string,
): Promise<{ paid: false } | { paid: true; cfPaymentId: string }> {
  const cashfree = getCashfreeClient();
  const response = await cashfree.PGOrderFetchPayments(orderId);
  const successful = response.data.find((payment) => payment.payment_status === "SUCCESS");
  if (!successful?.cf_payment_id) return { paid: false };
  return { paid: true, cfPaymentId: String(successful.cf_payment_id) };
}

export type CashfreeWebhookEvent = {
  type: string;
  object: {
    data?: {
      order?: { order_id?: string };
      payment?: { cf_payment_id?: string; payment_status?: string; payment_amount?: number };
    };
  };
};

/** Verifies the `x-webhook-signature`/`x-webhook-timestamp` headers against the raw webhook body. Throws on an invalid signature. */
export function verifyCashfreeWebhookSignature(
  rawBody: string,
  signature: string,
  timestamp: string,
): CashfreeWebhookEvent {
  const cashfree = getCashfreeClient();
  const event = cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp);
  return event as CashfreeWebhookEvent;
}
