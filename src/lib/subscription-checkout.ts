"use client";

import { loadRazorpayCheckout } from "@/lib/razorpay-checkout";
import {
  initiateSubscriptionPaymentAction,
  verifySubscriptionPaymentAction,
} from "@/server/actions/payment";

export type ChargeSubscriptionResult =
  | { status: "captured" }
  | { status: "dismissed" }
  | { status: "failed"; message?: string }
  | { status: "not_configured" }
  | { status: "script_error" };

/**
 * Opens Razorpay Checkout for a subscription and resolves once the modal
 * closes, however it closes. Never throws: if Razorpay isn't configured yet
 * in this environment (no keys set), it resolves with "not_configured" so
 * onboarding can still publish without charging — the dashboard's "Complete
 * payment" button covers whichever path didn't end in a captured payment.
 */
export async function chargeSubscriptionAtCheckout(
  subscriptionId: string,
): Promise<ChargeSubscriptionResult> {
  const order = await initiateSubscriptionPaymentAction(subscriptionId);
  if (!order.ok) return { status: "not_configured" };

  try {
    await loadRazorpayCheckout();
  } catch {
    return { status: "script_error" };
  }

  return new Promise<ChargeSubscriptionResult>((resolve) => {
    const razorpay = new window.Razorpay!({
      key: order.data.keyId,
      amount: order.data.amountPaise,
      currency: "INR",
      order_id: order.data.orderId,
      name: "GlowMakeOver",
      description: "Subscription plan payment",
      handler: async (response) => {
        const verified = await verifySubscriptionPaymentAction(
          subscriptionId,
          response.razorpay_order_id,
          response.razorpay_payment_id,
          response.razorpay_signature,
        );
        resolve(
          verified.ok ? { status: "captured" } : { status: "failed", message: verified.error },
        );
      },
      modal: { ondismiss: () => resolve({ status: "dismissed" }) },
    });
    razorpay.on("payment.failed", (response) =>
      resolve({ status: "failed", message: response.error.description }),
    );
    razorpay.open();
  });
}
