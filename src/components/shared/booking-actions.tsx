"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { transitionBookingAction } from "@/server/actions/booking";
import { allowedNextStatuses, BookingActor, BookingStatus } from "@/server/services/booking-status";

const LABELS: Record<BookingStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirm",
  IN_PROGRESS: "Start",
  COMPLETED: "Mark completed",
  CANCELLED: "Cancel",
  NO_SHOW: "Mark no-show",
  REFUNDED: "Refund",
};

export function BookingActions({
  bookingId,
  status,
  actorRole,
}: {
  bookingId: string;
  status: BookingStatus;
  actorRole: BookingActor;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<BookingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const options = allowedNextStatuses(status, actorRole);
  if (options.length === 0) return null;

  async function act(to: BookingStatus) {
    setPending(to);
    setError(null);
    const result = await transitionBookingAction(bookingId, to);
    setPending(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((to) => (
        <Button
          key={to}
          size="sm"
          variant={to === "CANCELLED" || to === "NO_SHOW" ? "outline" : "default"}
          disabled={pending !== null}
          onClick={() => act(to)}
        >
          {pending === to ? "..." : LABELS[to]}
        </Button>
      ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
