"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { chargeSubscriptionAtCheckout } from "@/lib/subscription-checkout";

export function SubscriptionPayButton({ subscriptionId }: { subscriptionId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onClick() {
    setPending(true);
    setMessage(null);
    const result = await chargeSubscriptionAtCheckout(subscriptionId);
    setPending(false);
    switch (result.status) {
      case "captured":
        setMessage("Payment successful — your plan is now active.");
        router.refresh();
        break;
      case "dismissed":
        setMessage("Payment window closed.");
        break;
      case "failed":
        setMessage(result.message ? `Payment failed: ${result.message}` : "Payment failed.");
        break;
      case "not_configured":
        setMessage(result.message ?? "Online payments aren't turned on for this account yet.");
        break;
      case "script_error":
        setMessage("Couldn't load the payment window. Check your connection and try again.");
        break;
    }
  }

  return (
    <div>
      <Button size="sm" onClick={onClick} disabled={pending}>
        {pending ? "Opening..." : "Complete payment"}
      </Button>
      {message && <p className="mt-1 text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
