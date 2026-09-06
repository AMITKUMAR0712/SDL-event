"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatPaiseAsINR } from "@/lib/money";
import { initiateBookingPaymentAction } from "@/server/actions/payment";

export function PayNowButton({ bookingId }: { bookingId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    const result = await initiateBookingPaymentAction(bookingId);
    setPending(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    // A real integration would load Razorpay Checkout here with this order
    // ID and let the user pay; that requires a live public key this
    // environment doesn't have configured, so we surface the created order
    // as proof the server-side flow works end-to-end.
    setMessage(
      `Order created (${formatPaiseAsINR(result.data.amountPaise)}) — checkout coming soon.`,
    );
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
