"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPaiseAsINR } from "@/lib/money";
import { createBeautyBookingAction } from "@/server/actions/booking";

type Service = { id: string; title: string; pricePaise: number; mode: string };

export function BookVendorForm({ vendorId, services }: { vendorId: string; services: Service[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [type, setType] = useState<"IN_STUDIO" | "AT_HOME">("IN_STUDIO");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const atHomeAvailable = services.some((s) => s.mode !== "IN_STUDIO");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (selected.length === 0 || !date || !time) {
      setError("Choose at least one service, a date, and a time.");
      return;
    }
    setPending(true);
    const scheduledAt = new Date(`${date}T${time}:00`);
    const result = await createBeautyBookingAction({
      vendorId,
      vendorServiceIds: selected,
      type,
      scheduledAt,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(`Booking ${result.data.bookingNo} requested — awaiting vendor confirmation.`);
    router.refresh();
  }

  const totalPaise = services
    .filter((s) => selected.includes(s.id))
    .reduce((sum, s) => sum + s.pricePaise, 0);

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-border p-4">
      <p className="font-medium">Book now</p>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-1">
        {services.map((s) => (
          <label key={s.id} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(s.id)}
                onChange={(e) =>
                  setSelected((prev) =>
                    e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id),
                  )
                }
              />
              {s.title}
            </span>
            <span>{formatPaiseAsINR(s.pricePaise)}</span>
          </label>
        ))}
      </div>

      {atHomeAvailable && (
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              checked={type === "IN_STUDIO"}
              onChange={() => setType("IN_STUDIO")}
            />
            In-studio
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" checked={type === "AT_HOME"} onChange={() => setType("AT_HOME")} />
            At-home
          </label>
        </div>
      )}

      <div className="flex gap-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="font-medium">Total: {formatPaiseAsINR(totalPaise)}</span>
        <Button type="submit" disabled={pending}>
          {pending ? "Booking..." : "Request booking"}
        </Button>
      </div>
    </form>
  );
}
