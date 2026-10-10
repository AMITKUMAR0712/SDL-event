import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { capturePayment } from "@/server/services/payment";
import { verifyWebhookSignature } from "@/server/services/razorpay";

export const runtime = "nodejs";

type RazorpayWebhookPayload = {
  event: string;
  payload: {
    payment?: { entity: { id: string; order_id: string; amount: number; status: string } };
  };
};

/**
 * Only `payment.*` events are handled — this app uses one-off Razorpay
 * Orders per booking and per subscription billing period (see
 * server/services/payment.ts), not Razorpay's native recurring
 * Subscriptions entity, so there is no `subscription.*` webhook to react to
 * yet. A plan period currently lapses and is renewed by another one-time
 * payment rather than being auto-charged; wiring up real Razorpay
 * Subscriptions (mandates, proration, dunning) is deferred — see
 * docs/CHANGELOG.md.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    logger.warn("[razorpay-webhook] invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const body = JSON.parse(rawBody) as RazorpayWebhookPayload;

  try {
    switch (body.event) {
      case "payment.captured":
        await handlePaymentCaptured(body);
        break;
      case "payment.failed":
        await handlePaymentFailed(body);
        break;
      default:
        // Unhandled event types are fine to ignore — Razorpay sends many we don't act on.
        break;
    }
  } catch (error) {
    logger.error("[razorpay-webhook] handler failed", { event: body.event, error: String(error) });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function handlePaymentCaptured(body: RazorpayWebhookPayload) {
  const entity = body.payload.payment?.entity;
  if (!entity) return;
  await capturePayment("RAZORPAY", entity.order_id, entity.id, body);
}

async function handlePaymentFailed(body: RazorpayWebhookPayload) {
  const entity = body.payload.payment?.entity;
  if (!entity) return;

  const payment = await db.payment.findFirst({
    where: { provider: "RAZORPAY", providerOrderId: entity.order_id },
  });
  if (!payment || payment.status === "FAILED") return;

  await db.payment.update({
    where: { id: payment.id },
    data: { status: "FAILED", rawPayload: body as object },
  });
}
