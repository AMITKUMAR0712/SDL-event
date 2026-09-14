"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { runSubscriptionExpirySweepAction } from "@/server/actions/admin";

export function ExpireSubscriptionsButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setMessage(null);
    const result = await runSubscriptionExpirySweepAction();
    setPending(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(
      result.data.count === 0
        ? "No overdue subscriptions found."
        : `Unpublished ${result.data.count} expired subscription(s).`,
    );
    router.refresh();
  }

  return (
    <div>
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={run}>
        {pending ? "Checking..." : "Run subscription expiry check"}
      </Button>
      {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
