"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createPlatformCouponAction,
  deleteCouponAction,
  updatePlatformCouponAction,
} from "@/server/actions/admin";

type Coupon = {
  id: string;
  code: string;
  discountType: "PERCENT" | "FLAT";
  value: number;
  appliesTo: "BOOKING" | "SUBSCRIPTION" | "UNLOCK";
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
};

export function CouponForm({ coupon, onDone }: { coupon?: Coupon; onDone?: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState(coupon?.code ?? "");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FLAT">(
    coupon?.discountType ?? "PERCENT",
  );
  const [value, setValue] = useState(coupon?.value ?? 10);
  const [appliesTo, setAppliesTo] = useState<"BOOKING" | "SUBSCRIPTION" | "UNLOCK">(
    coupon?.appliesTo ?? "BOOKING",
  );
  const [isActive, setIsActive] = useState(coupon?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const input = {
      code,
      discountType,
      value,
      appliesTo,
      startsAt: coupon?.startsAt ?? new Date(),
      endsAt: coupon?.endsAt ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      isActive,
    };
    const result = coupon
      ? await updatePlatformCouponAction(coupon.id, input)
      : await createPlatformCouponAction(input);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (!coupon) setCode("");
    onDone?.();
    router.refresh();
  }

  async function remove() {
    if (!coupon) return;
    if (!window.confirm(`Delete coupon "${coupon.code}"? It will stop working immediately.`)) {
      return;
    }
    setPending(true);
    setError(null);
    const result = await deleteCouponAction(coupon.id);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone?.();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg border border-border p-4">
      <p className="font-medium">{coupon ? `Edit ${coupon.code}` : "New platform coupon"}</p>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Input
        placeholder="CODE"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
      />
      <div className="flex flex-wrap gap-2">
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
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="size-4"
          />
          Active
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving..." : coupon ? "Save changes" : "Create"}
        </Button>
        {coupon && (
          <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={remove}>
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
