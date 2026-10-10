"use client";

import { submitPayUCheckout } from "@/lib/payu-checkout";
import { initiateSubscriptionPaymentAction } from "@/server/actions/payment";

export type ChargeSubscriptionResult =
  | { status: "redirecting" }
  | { status: "not_configured"; message?: string }
  | { status: "script_error" };

/**
 * Posts the signed checkout form to PayU. The signed callback is verified on
 * the server before any payment effects are applied.
 */
export async function chargeSubscriptionAtCheckout(
  subscriptionId: string,
  checkoutEmail: string,
): Promise<ChargeSubscriptionResult> {
  const order = await initiateSubscriptionPaymentAction(subscriptionId, checkoutEmail);
  if (!order.ok) return { status: "not_configured", message: order.error };

  try {
    submitPayUCheckout(order.data.checkoutUrl, order.data.fields);
  } catch {
    return { status: "script_error" };
  }
  return { status: "redirecting" };
}
