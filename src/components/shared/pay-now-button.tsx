"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitPayUCheckout } from "@/lib/payu-checkout";
import { initiateBookingPaymentAction } from "@/server/actions/payment";

export function PayNowButton({
  bookingId,
  defaultEmail,
}: {
  bookingId: string;
  defaultEmail: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [checkoutEmail, setCheckoutEmail] = useState(defaultEmail);

  async function onClick() {
    setPending(true);
    setMessage(null);

    const order = await initiateBookingPaymentAction(bookingId, checkoutEmail);
    if (!order.ok) {
      setPending(false);
      setMessage(order.error);
      return;
    }

    try {
      submitPayUCheckout(order.data.checkoutUrl, order.data.fields);
    } catch {
      setPending(false);
      setMessage("Couldn't open PayU checkout. Check your connection and try again.");
    }
  }

  return (
    <div>
      <label htmlFor={`payu-email-${bookingId}`} className="mb-1 block text-xs font-medium">
        Email for payment receipt
      </label>
      <Input
        id={`payu-email-${bookingId}`}
        type="email"
        autoComplete="email"
        value={checkoutEmail}
        onChange={(event) => setCheckoutEmail(event.target.value)}
        disabled={pending}
        required
      />
      <p className="mt-1 text-xs text-muted-foreground">
        Used for the PayU receipt only; your account email won&apos;t change.
      </p>
      <Button size="sm" variant="outline" onClick={onClick} disabled={pending}>
        {pending ? "..." : "Pay now"}
      </Button>
      {message && <p className="mt-1 text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
