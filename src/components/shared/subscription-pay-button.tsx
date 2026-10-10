"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chargeSubscriptionAtCheckout } from "@/lib/subscription-checkout";

export function SubscriptionPayButton({
  subscriptionId,
  defaultEmail,
}: {
  subscriptionId: string;
  defaultEmail: string;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [checkoutEmail, setCheckoutEmail] = useState(defaultEmail);

  async function onClick() {
    setPending(true);
    setMessage(null);
    const result = await chargeSubscriptionAtCheckout(subscriptionId, checkoutEmail);
    if (result.status === "redirecting") return;
    setPending(false);
    switch (result.status) {
      case "not_configured":
        setMessage(result.message ?? "Online payments aren't turned on for this account yet.");
        break;
      case "script_error":
        setMessage("Couldn't open PayU checkout. Check your connection and try again.");
        break;
    }
  }

  return (
    <div>
      <label
        htmlFor={`payu-subscription-email-${subscriptionId}`}
        className="mb-1 block text-xs font-medium"
      >
        Email for payment receipt
      </label>
      <Input
        id={`payu-subscription-email-${subscriptionId}`}
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
      <Button size="sm" onClick={onClick} disabled={pending}>
        {pending ? "Opening..." : "Complete payment"}
      </Button>
      {message && <p className="mt-1 text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
