"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatPaiseAsINR } from "@/lib/money";
import { cancelBookingAction, cancelBookingsAction } from "@/server/actions/admin";

type BookingRow = {
  id: string;
  bookingNo: string;
  type: string;
  status: string;
  totalPaise: number;
  contactPhone: string | null;
  customer: { name: string | null; email: string | null };
};

const TERMINAL_STATUSES = new Set(["CANCELLED", "REFUNDED"]);

export function BookingList({ bookings }: { bookings: BookingRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);

  const selectableIds = bookings.filter((b) => !TERMINAL_STATUSES.has(b.status)).map((b) => b.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectableIds));
  }

  async function cancelOne(id: string, bookingNo: string) {
    if (!window.confirm(`Cancel booking ${bookingNo}? Any applicable refund will be calculated.`)) {
      return;
    }
    setPending(true);
    const result = await cancelBookingAction(id);
    setPending(false);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    router.refresh();
  }

  async function cancelSelected() {
    if (selected.size === 0) return;
    if (
      !window.confirm(
        `Cancel ${selected.size} booking${selected.size > 1 ? "s" : ""}? Any applicable refunds will be calculated.`,
      )
    ) {
      return;
    }
    setPending(true);
    const result = await cancelBookingsAction(Array.from(selected));
    setPending(false);
    if (result.ok) {
      setSelected(new Set());
      if (result.data.skipped > 0) {
        window.alert(`Cancelled ${result.data.cancelled}, skipped ${result.data.skipped}.`);
      }
    }
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 py-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            disabled={selectableIds.length === 0}
            className="size-4"
          />
          Select all
        </label>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={selected.size === 0 || pending}
          onClick={cancelSelected}
        >
          Cancel selected ({selected.size})
        </Button>
      </div>
      <div className="divide-y divide-border rounded-lg border border-border">
        {bookings.map((b) => {
          const isTerminal = TERMINAL_STATUSES.has(b.status);
          return (
            <div key={b.id} className="flex items-center gap-3 p-3 text-sm">
              <input
                type="checkbox"
                checked={selected.has(b.id)}
                onChange={() => toggle(b.id)}
                disabled={isTerminal}
                className="size-4"
              />
              <div className="flex-1">
                <p className="font-medium">{b.bookingNo}</p>
                <p className="text-muted-foreground">
                  {b.customer.name ?? b.customer.email} · {b.type}
                  {b.contactPhone && ` · ${b.contactPhone}`}
                </p>
              </div>
              <div className="text-right">
                <p>{b.status}</p>
                <p className="text-muted-foreground">{formatPaiseAsINR(b.totalPaise)}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={isTerminal || pending}
                onClick={() => cancelOne(b.id, b.bookingNo)}
              >
                Cancel
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
