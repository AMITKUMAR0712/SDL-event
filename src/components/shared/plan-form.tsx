"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPlanAction, updatePlanAction } from "@/server/actions/admin";

type FeatureRow = {
  key: string;
  label: string;
  type: "INT" | "BOOL" | "TEXT";
  valueInt?: number;
  valueBool?: boolean;
  valueText?: string;
};

type Plan = {
  id: string;
  audience: "VENDOR" | "BANQUET" | "CUSTOMER";
  code: string;
  name: string;
  description: string | null;
  pricePaise: number;
  compareAtPricePaise: number | null;
  billingPeriod: "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY";
  trialDays: number;
  isActive: boolean;
  sortOrder: number;
  features: {
    key: string;
    label: string;
    valueInt: number | null;
    valueBool: boolean | null;
    valueText: string | null;
  }[];
};

function toFeatureRows(features: Plan["features"]): FeatureRow[] {
  return features.map((f) => ({
    key: f.key,
    label: f.label,
    type: f.valueBool !== null ? "BOOL" : f.valueText !== null ? "TEXT" : "INT",
    valueInt: f.valueInt ?? undefined,
    valueBool: f.valueBool ?? undefined,
    valueText: f.valueText ?? undefined,
  }));
}

export function PlanForm({ plan, onDone }: { plan?: Plan; onDone?: () => void }) {
  const router = useRouter();
  const [audience, setAudience] = useState<Plan["audience"]>(plan?.audience ?? "VENDOR");
  const [code, setCode] = useState(plan?.code ?? "");
  const [name, setName] = useState(plan?.name ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [pricePaise, setPricePaise] = useState(String((plan?.pricePaise ?? 0) / 100));
  const [billingPeriod, setBillingPeriod] = useState<Plan["billingPeriod"]>(
    plan?.billingPeriod ?? "QUARTERLY",
  );
  const [trialDays, setTrialDays] = useState(String(plan?.trialDays ?? 0));
  const [isActive, setIsActive] = useState(plan?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(String(plan?.sortOrder ?? 0));
  const [features, setFeatures] = useState<FeatureRow[]>(plan ? toFeatureRows(plan.features) : []);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function updateFeature(index: number, patch: Partial<FeatureRow>) {
    setFeatures((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addFeature() {
    setFeatures((rows) => [...rows, { key: "", label: "", type: "BOOL", valueBool: true }]);
  }

  function removeFeature(index: number) {
    setFeatures((rows) => rows.filter((_, i) => i !== index));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const input = {
      audience,
      code,
      name,
      description,
      pricePaise: Math.round(Number(pricePaise) * 100),
      billingPeriod,
      trialDays: Number(trialDays),
      isActive,
      sortOrder: Number(sortOrder),
      features,
    };

    const result = plan ? await updatePlanAction(plan.id, input) : await createPlanAction(input);

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (!plan) {
      setCode("");
      setName("");
      setPricePaise("0");
      setFeatures([]);
    }
    onDone?.();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-border p-4">
      <p className="font-medium">{plan ? `Edit ${plan.name}` : "New plan"}</p>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-2">
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value as Plan["audience"])}
          className="rounded-lg border border-input bg-transparent px-2 py-1 text-sm"
        >
          <option value="VENDOR">Vendor</option>
          <option value="BANQUET">Banquet</option>
          <option value="CUSTOMER">Customer</option>
        </select>
        <Input
          placeholder="CODE (e.g. VENDOR_3M)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <select
          value={billingPeriod}
          onChange={(e) => setBillingPeriod(e.target.value as Plan["billingPeriod"])}
          className="rounded-lg border border-input bg-transparent px-2 py-1 text-sm"
        >
          <option value="MONTHLY">Monthly</option>
          <option value="QUARTERLY">3 months</option>
          <option value="HALF_YEARLY">6 months</option>
          <option value="YEARLY">12 months</option>
        </select>
        <Input
          placeholder="Price (₹)"
          type="number"
          step="1"
          value={pricePaise}
          onChange={(e) => setPricePaise(e.target.value)}
        />
        <Input
          placeholder="Trial days"
          type="number"
          value={trialDays}
          onChange={(e) => setTrialDays(e.target.value)}
        />
        <Input
          placeholder="Sort order"
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        />
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
      <Input
        placeholder="Description (shown on the pricing card)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
        <p className="text-sm font-medium">Features</p>
        {features.map((feature, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="KEY"
              value={feature.key}
              onChange={(e) => updateFeature(i, { key: e.target.value.toUpperCase() })}
              className="w-32"
            />
            <Input
              placeholder="Label shown to users"
              value={feature.label}
              onChange={(e) => updateFeature(i, { label: e.target.value })}
              className="flex-1"
            />
            <select
              value={feature.type}
              onChange={(e) => updateFeature(i, { type: e.target.value as FeatureRow["type"] })}
              className="rounded-lg border border-input bg-transparent px-2 py-1 text-sm"
            >
              <option value="INT">Number</option>
              <option value="BOOL">Yes/No</option>
              <option value="TEXT">Text</option>
            </select>
            {feature.type === "INT" && (
              <Input
                type="number"
                placeholder="Value"
                value={feature.valueInt ?? ""}
                onChange={(e) => updateFeature(i, { valueInt: Number(e.target.value) })}
                className="w-24"
              />
            )}
            {feature.type === "BOOL" && (
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={feature.valueBool ?? false}
                  onChange={(e) => updateFeature(i, { valueBool: e.target.checked })}
                />
                Yes
              </label>
            )}
            {feature.type === "TEXT" && (
              <Input
                placeholder="Value"
                value={feature.valueText ?? ""}
                onChange={(e) => updateFeature(i, { valueText: e.target.value })}
                className="w-32"
              />
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => removeFeature(i)}>
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addFeature}>
          + Add feature
        </Button>
      </div>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving..." : plan ? "Save changes" : "Create plan"}
      </Button>
    </form>
  );
}
