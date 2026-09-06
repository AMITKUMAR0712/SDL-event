"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { loadRazorpayCheckout } from "@/lib/razorpay-checkout";
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

    try {
      await loadRazorpayCheckout();
    } catch {
      setPending(false);
      setMessage("Couldn't load the payment window. Check your connection and try again.");
      return;
    }

    const razorpay = new window.Razorpay!({
      key: order.data.keyId,
      amount: order.data.amountPaise,
      currency: "INR",
      order_id: order.data.orderId,
      name: "GlowMakeOver",
      description: "Booking payment",
      handler: async (response) => {
        const verified = await verifyBookingPaymentAction(
          bookingId,
          response.razorpay_order_id,
          response.razorpay_payment_id,
          response.razorpay_signature,
        );
        setPending(false);
        if (!verified.ok) {
          setMessage(verified.error);
          return;
        }
        setMessage("Payment successful — booking confirmed.");
        router.refresh();
      },
      modal: {
        ondismiss: () => {
          setPending(false);
          setMessage("Payment window closed.");
        },
      },
    });

    razorpay.on("payment.failed", (response) => {
      setPending(false);
      setMessage(`Payment failed: ${response.error.description}`);
    });

    razorpay.open();
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
