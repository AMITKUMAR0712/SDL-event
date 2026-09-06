import "server-only";

import Razorpay from "razorpay";
// Not exposed as a Razorpay static (only validateWebhookSignature is) —
// imported directly from its actual home in the SDK.
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils";

import { env } from "@/lib/env";

let client: Razorpay | undefined;

/** Throws if Razorpay isn't configured — every caller is inside a payment flow that requires it. */
export function getRazorpayClient(): Razorpay {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay is not configured (RAZORPAY_KEY_ID/KEY_SECRET missing).");
  }
  client ??= new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
  return client;
}

export async function createRazorpayOrder(amountPaise: number, receipt: string) {
  const razorpay = getRazorpayClient();
  return razorpay.orders.create({ amount: amountPaise, currency: "INR", receipt });
}

/** Verifies the signature Razorpay Checkout returns to the browser after a successful payment. */
export function verifyCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  return validatePaymentVerification(
    { order_id: orderId, payment_id: paymentId },
    signature,
    env.RAZORPAY_KEY_SECRET,
  );
}

/** Verifies the `x-razorpay-signature` header against the raw webhook body. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  return Razorpay.validateWebhookSignature(rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET);
}
