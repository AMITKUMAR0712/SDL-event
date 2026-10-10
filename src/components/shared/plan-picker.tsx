"use client";

import { cn } from "cn";
import { BadgeCheck, ShieldCheck, Sparkles } from "lucide-react";

import { formatPaiseAsINR } from "@/lib/money";

export const BILLING_PERIOD_LABEL: Record<string, string> = {
  MONTHLY: "/ month",
  QUARTERLY: "for 3 months",
  HALF_YEARLY: "for 6 months",
  YEARLY: "for 12 months",
};

export type PlanPickerFeature = {
  id: string;
  key: string;
  label: string;
  valueBool: boolean | null;
};

export type PlanPickerPlan = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  pricePaise: number;
  compareAtPricePaise?: number | null;
  billingPeriod: string;
  trialDays: number;
  features: PlanPickerFeature[];
};

export function PlanPicker({
  plans,
  value,
  onChange,
}: {
  plans: PlanPickerPlan[];
  value: string;
  onChange: (code: string) => void;
}) {
  const popularIndex = plans.length >= 2 ? Math.min(1, plans.length - 1) : -1;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan, i) => {
          const selected = value === plan.code;
          const popular = i === popularIndex;
          return (
            <button
              key={plan.code}
              type="button"
              onClick={() => onChange(plan.code)}
              className={cn(
                "relative flex flex-col rounded-2xl border-2 bg-card p-5 text-left shadow-sm transition hover:shadow-md",
                selected ? "border-primary! ring-2 ring-primary/30" : "border-border",
              )}
            >
              {popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
                  Most popular
                </span>
              )}
              <p className="font-heading text-lg font-semibold">{plan.name}</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{formatPaiseAsINR(plan.pricePaise)}</span>
                {plan.compareAtPricePaise && plan.compareAtPricePaise > plan.pricePaise && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPaiseAsINR(plan.compareAtPricePaise)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {BILLING_PERIOD_LABEL[plan.billingPeriod] ?? ""}
              </p>
              {plan.description && (
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              )}
              <ul className="mt-4 space-y-2 text-sm">
                {plan.features
                  .filter((f) => f.valueBool !== false)
                  .map((f) => (
                    <li key={f.id} className="flex items-start gap-2">
                      <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{f.label}</span>
                    </li>
                  ))}
              </ul>
              {plan.trialDays > 0 && (
                <p className="mt-3 text-xs font-medium text-primary">
                  Includes a {plan.trialDays}-day free trial
                </p>
              )}
              <div
                className={cn(
                  "mt-4 rounded-lg border py-2 text-center text-sm font-medium",
                  selected
                    ? "border-primary! bg-primary text-primary-foreground"
                    : "border-border text-foreground",
                )}
              >
                {selected ? "Selected" : "Choose this plan"}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-xl bg-accent/40 px-4 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="size-4 text-primary" /> Secured by PayU
        </span>
        <span className="flex items-center gap-1.5">
          <BadgeCheck className="size-4 text-primary" /> 100% safe & encrypted payments
        </span>
        <span className="flex items-center gap-1.5">
          <Sparkles className="size-4 text-primary" /> Cancel or switch plans anytime
        </span>
      </div>
    </div>
  );
}
