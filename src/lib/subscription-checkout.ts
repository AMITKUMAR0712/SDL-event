"use client";

import { openCashfreeCheckout } from "@/lib/cashfree-checkout";
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
 * Opens Cashfree Checkout for a subscription and resolves once the modal
 * closes, however it closes. Never throws: if Cashfree isn't configured yet
 * in this environment (no keys set), it resolves with "not_configured" so
 * onboarding can still publish without charging — the dashboard's "Complete
 * payment" button covers whichever path didn't end in a captured payment.
 */
export async function chargeSubscriptionAtCheckout(
  subscriptionId: string,
): Promise<ChargeSubscriptionResult> {
  const order = await initiateSubscriptionPaymentAction(subscriptionId);
  if (!order.ok) return { status: "not_configured" };

  let result;
  try {
    result = await openCashfreeCheckout(order.data.paymentSessionId, order.data.mode);
  } catch {
    return { status: "script_error" };
  }

  if (result.error) {
    return { status: "failed", message: result.error.message };
  }

  const verified = await verifySubscriptionPaymentAction(subscriptionId, order.data.orderId);
  if (!verified.ok) {
    // Could genuinely be a failure, or the modal was dismissed without
    // paying — either way nothing was captured, so "dismissed" (rather than
    // "failed") keeps onboarding from showing a scary error for a plain
    // cancel.
    return { status: "dismissed" };
  }
  return { status: "captured" };
}
