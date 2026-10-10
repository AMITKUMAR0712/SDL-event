import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { verifyCashfreeWebhookSignature } from "@/server/services/cashfree";
import { capturePayment } from "@/server/services/payment";

export const runtime = "nodejs";

/**
 * Only `PAYMENT_*` events are handled — this app uses one-off Cashfree
 * Orders per booking and per subscription billing period (see
 * server/services/payment.ts), not a recurring Subscriptions entity, so
 * there's no subscription-renewal webhook to react to yet. A plan period
 * currently lapses and is renewed by another one-time payment rather than
 * being auto-charged — see docs/CHANGELOG.md.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-signature");
  const timestamp = req.headers.get("x-webhook-timestamp");

  if (!signature || !timestamp) {
    logger.warn("[cashfree-webhook] missing signature headers");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: ReturnType<typeof verifyCashfreeWebhookSignature>;
  try {
    event = verifyCashfreeWebhookSignature(rawBody, signature, timestamp);
  } catch (error) {
    logger.warn("[cashfree-webhook] invalid signature", { error: String(error) });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "PAYMENT_SUCCESS_WEBHOOK":
        await handlePaymentSuccess(event);
        break;
      case "PAYMENT_FAILED_WEBHOOK":
        await handlePaymentFailed(event);
        break;
      default:
        // Unhandled event types are fine to ignore — Cashfree sends many we don't act on.
        break;
    }
  } catch (error) {
    logger.error("[cashfree-webhook] handler failed", { type: event.type, error: String(error) });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function handlePaymentSuccess(event: ReturnType<typeof verifyCashfreeWebhookSignature>) {
  const orderId = event.object.data?.order?.order_id;
  const cfPaymentId = event.object.data?.payment?.cf_payment_id;
  if (!orderId || !cfPaymentId) return;
  await capturePayment("CASHFREE", orderId, cfPaymentId, event.object);
}

async function handlePaymentFailed(event: ReturnType<typeof verifyCashfreeWebhookSignature>) {
  const orderId = event.object.data?.order?.order_id;
  if (!orderId) return;

  const payment = await db.payment.findFirst({
    where: { provider: "CASHFREE", providerOrderId: orderId },
  });
  if (!payment || payment.status === "FAILED") return;

  await db.payment.update({
    where: { id: payment.id },
    data: { status: "FAILED", rawPayload: event.object as object },
  });
}
