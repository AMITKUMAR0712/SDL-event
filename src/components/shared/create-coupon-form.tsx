"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPlatformCouponAction } from "@/server/actions/admin";

export function CreateCouponForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FLAT">("PERCENT");
  const [value, setValue] = useState(10);
  const [appliesTo, setAppliesTo] = useState<"BOOKING" | "SUBSCRIPTION" | "UNLOCK">("BOOKING");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await createPlatformCouponAction({
      code,
      discountType,
      value,
      appliesTo,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCode("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg border border-border p-4">
      <p className="font-medium">New platform coupon</p>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Input placeholder="CODE" value={code} onChange={(e) => setCode(e.target.value)} />
      <div className="flex gap-2">
        <select
          value={discountType}
          onChange={(e) => setDiscountType(e.target.value as "PERCENT" | "FLAT")}
          className="rounded-lg border border-input bg-transparent px-2 py-1 text-sm"
        >
          <option value="PERCENT">Percent</option>
          <option value="FLAT">Flat (paise)</option>
        </select>
        <Input
          type="number"
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-24"
        />
        <select
          value={appliesTo}
          onChange={(e) => setAppliesTo(e.target.value as typeof appliesTo)}
          className="rounded-lg border border-input bg-transparent px-2 py-1 text-sm"
        >
          <option value="BOOKING">Booking</option>
          <option value="SUBSCRIPTION">Subscription</option>
          <option value="UNLOCK">Unlock</option>
        </select>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Creating..." : "Create"}
      </Button>
    </form>
  );
}
