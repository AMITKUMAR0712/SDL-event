"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBeautyBookingAction } from "@/server/actions/booking";

type Service = { id: string; title: string; pricePaise: number; mode: string };

export function BookVendorForm({ vendorId, services }: { vendorId: string; services: Service[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [type, setType] = useState<"IN_STUDIO" | "AT_HOME">("IN_STUDIO");
  const [couponCode, setCouponCode] = useState("");
  const [phone, setPhone] = useState("");
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
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit mobile number so the vendor can reach you.");
      return;
    }
    setPending(true);
    const scheduledAt = new Date(`${date}T${time}:00`);
    const result = await createBeautyBookingAction({
      vendorId,
      vendorServiceIds: selected,
      type,
      scheduledAt,
      couponCode: couponCode || undefined,
      contactPhone: phone,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(`Booking ${result.data.bookingNo} requested — awaiting vendor confirmation.`);
    router.refresh();
  }

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

      <Input
        type="tel"
        inputMode="numeric"
        placeholder="Your 10-digit mobile number"
        value={phone}
        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
        maxLength={10}
      />

      <Input
        placeholder="Coupon code (optional)"
        value={couponCode}
        onChange={(e) => setCouponCode(e.target.value)}
      />

      <div className="flex items-center justify-end pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Booking..." : "Request booking"}
        </Button>
      </div>
    </form>
  );
}
