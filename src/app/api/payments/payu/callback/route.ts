import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { capturePayment } from "@/server/services/payment";
import { verifyPayUReturn, verifyPayUTransaction } from "@/server/services/payu";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!env.PAYU_KEY || !env.PAYU_SALT) {
    logger.error("[payu-callback] PayU credentials are not configured");
    return NextResponse.json({ error: "Payment processing is unavailable." }, { status: 503 });
  }

  const formData = await req.formData();
  const values: Record<string, string> = {};
  for (const [name, value] of formData.entries()) {
    if (typeof value !== "string") {
      return NextResponse.json({ error: "Invalid callback form." }, { status: 400 });
    }
    values[name] = value;
  }

  try {
    if (!verifyPayUReturn(values)) {
      logger.warn("[payu-callback] invalid response hash");
      return NextResponse.json({ error: "Invalid payment response." }, { status: 400 });
    }
  } catch (error) {
    logger.error("[payu-callback] response validation failed", { error: String(error) });
    return NextResponse.json({ error: "Could not validate payment response." }, { status: 500 });
  }

  const txnId = values.txnid;
  const payment = await db.payment.findFirst({
    where: { provider: "PAYU", providerOrderId: txnId },
    include: { subscription: { select: { userId: true } } },
  });
  if (!payment) {
    logger.warn("[payu-callback] no payment matches transaction", { txnId });
    return NextResponse.json({ error: "Payment order not found." }, { status: 404 });
  }

  try {
    const verified = await verifyPayUTransaction(txnId);
    const providerPayload = {
      txnid: txnId,
      status: values.status,
      amount: values.amount,
    };
    if (verified.status === "success") {
      if (verified.amountPaise !== payment.amountPaise) {
        logger.error("[payu-callback] verified amount mismatch", {
          paymentId: payment.id,
          expectedPaise: payment.amountPaise,
          receivedPaise: verified.amountPaise,
        });
        return NextResponse.json({ error: "Payment amount did not match." }, { status: 400 });
      }
      await capturePayment("PAYU", txnId, verified.paymentId, {
        ...providerPayload,
        mihpayid: verified.paymentId,
      });
      return redirectForPayment(payment, "success");
    }

    if (verified.status === "failed") {
      await db.payment.updateMany({
        where: { id: payment.id, status: { not: "CAPTURED" } },
        data: { status: "FAILED", rawPayload: providerPayload },
      });
      return redirectForPayment(payment, "failed");
    }

    return redirectForPayment(payment, "pending");
  } catch (error) {
    logger.error("[payu-callback] server verification failed", {
      paymentId: payment.id,
      error: String(error),
    });
    return NextResponse.json({ error: "Could not verify payment with PayU." }, { status: 502 });
  }
}

async function redirectForPayment(
  payment: {
    id: string;
    bookingId: string | null;
    subscriptionId: string | null;
    subscription: { userId: string } | null;
  },
  status: "success" | "failed" | "pending",
) {
  let path = "/account";
  if (payment.bookingId) {
    path = `/account/bookings?payment=${status}`;
  } else if (status === "success") {
    path = `/payment-success?paymentId=${encodeURIComponent(payment.id)}`;
  } else if (payment.subscription) {
    const user = await db.user.findUnique({
      where: { id: payment.subscription.userId },
      select: { role: true },
    });
    path =
      user?.role === "VENDOR"
        ? `/dashboard/vendor?payment=${status}`
        : user?.role === "BANQUET_OWNER"
          ? `/dashboard/banquet?payment=${status}`
          : `/account?payment=${status}`;
  }

  return NextResponse.redirect(new URL(path, env.NEXT_PUBLIC_APP_URL), 303);
}
