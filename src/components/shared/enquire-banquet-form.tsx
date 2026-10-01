"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createVenueEnquiryAction } from "@/server/actions/booking";

export function EnquireBanquetForm({ banquetId }: { banquetId: string }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [guestCount, setGuestCount] = useState(100);
  const [plateType, setPlateType] = useState<"VEG" | "NON_VEG">("VEG");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!date) {
      setError("Choose a date.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit mobile number so the venue can reach you.");
      return;
    }
    setPending(true);
    const result = await createVenueEnquiryAction({
      banquetId,
      scheduledAt: new Date(`${date}T12:00:00`),
      guestCount,
      plateType,
      contactPhone: phone,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(`Enquiry ${result.data.bookingNo} sent — the venue will confirm availability.`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-border p-4">
      <p className="font-medium">Get a quote</p>
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
      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <Input
        type="tel"
        inputMode="numeric"
        placeholder="Your 10-digit mobile number"
        value={phone}
        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
        maxLength={10}
      />
      <Input
        type="number"
        min={1}
        value={guestCount}
        onChange={(e) => setGuestCount(Number(e.target.value))}
        placeholder="Guest count"
      />
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" checked={plateType === "VEG"} onChange={() => setPlateType("VEG")} />
          Veg
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={plateType === "NON_VEG"}
            onChange={() => setPlateType("NON_VEG")}
          />
          Non-veg
        </label>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending..." : "Send enquiry"}
      </Button>
    </form>
  );
}
