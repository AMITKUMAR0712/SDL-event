import { db } from "@/lib/db";

export function findCapturedSubscriptionPayment(paymentId: string) {
  return db.payment.findFirst({
    where: {
      id: paymentId,
      status: "CAPTURED",
      subscriptionId: { not: null },
    },
    select: {
      id: true,
      providerPaymentId: true,
      amountPaise: true,
      subscription: { select: { userId: true } },
    },
  });
}
