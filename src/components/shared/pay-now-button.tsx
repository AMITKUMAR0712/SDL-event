"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { openCashfreeCheckout } from "@/lib/cashfree-checkout";
import { initiateBookingPaymentAction, verifyBookingPaymentAction } from "@/server/actions/payment";

export function PayNowButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    setMessage(null);

    const order = await initiateBookingPaymentAction(bookingId);
    if (!order.ok) {
      setPending(false);
      setMessage(order.error);
      return;
    }

    let result;
    try {
      result = await openCashfreeCheckout(order.data.paymentSessionId, order.data.mode);
    } catch {
      setPending(false);
      setMessage("Couldn't load the payment window. Check your connection and try again.");
      return;
    }

    if (result.error) {
      setPending(false);
      setMessage(`Payment failed: ${result.error.message ?? "please try again."}`);
      return;
    }

    const verified = await verifyBookingPaymentAction(bookingId, order.data.orderId);
    setPending(false);
    if (!verified.ok) {
      setMessage(verified.error);
      return;
    }
    setMessage("Payment successful — booking confirmed.");
    router.refresh();
  }

  return (
    <div>
      <Button size="sm" variant="outline" onClick={onClick} disabled={pending}>
        {pending ? "..." : "Pay now"}
      </Button>
      {message && <p className="mt-1 text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
