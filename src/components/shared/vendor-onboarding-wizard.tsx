"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { PlanPicker, type PlanPickerPlan } from "@/components/shared/plan-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPaiseAsINR } from "@/lib/money";
import { chargeSubscriptionAtCheckout } from "@/lib/subscription-checkout";
import { VendorOnboardingInput, vendorOnboardingSchema } from "@/schemas/onboarding";
import { completeVendorOnboardingAction } from "@/server/actions/onboarding";

const STORAGE_KEY = "onboarding:vendor";

const STEPS = ["Business", "Location", "Services", "Documents", "Plan"] as const;

type Props = {
  cities: { id: string; name: string }[];
  serviceCatalog: { id: string; name: string; categoryId: string }[];
  plans: PlanPickerPlan[];
  accountName: string | null;
  accountEmail: string | null;
};

export function VendorOnboardingWizard({
  cities,
  serviceCatalog,
  plans,
  accountName,
  accountEmail,
}: Props) {
  const router = useRouter();
  const { update } = useSession();
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<VendorOnboardingInput>({
    resolver: zodResolver(vendorOnboardingSchema),
    defaultValues: {
      businessName: "",
      cityId: "",
      addressLine1: "",
      pincode: "",
      servesInStudio: true,
      servesAtHome: false,
      homeServiceRadiusKm: 0,
      serviceCatalogIds: [],
      planCode: plans[0]?.code ?? "",
    },
  });

  // Resume a dropped-off wizard from localStorage.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        form.reset(JSON.parse(saved));
      } catch {
        // ignore corrupt saved state
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const subscription = form.watch((values) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const stepFields: (keyof VendorOnboardingInput)[][] = [
    ["businessName"],
    ["cityId", "addressLine1", "pincode"],
    ["serviceCatalogIds"],
    [],
    ["planCode"],
  ];

  async function goNext() {
    const valid = await form.trigger(stepFields[step]);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(values: VendorOnboardingInput) {
    setServerError(null);
    const result = await completeVendorOnboardingAction(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    await update(); // refresh the JWT so session.user.vendorId picks up the new profile

    if (result.data.subscriptionId) {
      // Publishing never waits on this — it only affects whether the new
      // subscription shows as paid on the dashboard afterwards.
      await chargeSubscriptionAtCheckout(result.data.subscriptionId);
    }

    router.push("/dashboard/vendor");
    router.refresh();
  }

  const servesAtHome = form.watch("servesAtHome");
  const selectedServices = form.watch("serviceCatalogIds");
  const selectedPlanCode = form.watch("planCode");
  const selectedPlan = plans.find((p) => p.code === selectedPlanCode);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <ol className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {STEPS.map((label, i) => (
            <li key={label} className={i === step ? "font-semibold text-foreground" : undefined}>
              {i + 1}. {label}
            </li>
          ))}
        </ol>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        {step === 0 && (
          <div className="space-y-4">
            {(accountName || accountEmail) && (
              <p className="rounded-lg bg-accent/50 px-3 py-2 text-sm text-muted-foreground">
                Setting up as {accountName ?? "your account"}
                {accountEmail && ` (${accountEmail})`}.
              </p>
            )}
            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="cityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a city">
                          {(value: string | null) =>
                            cities.find((city) => city.id === value)?.name ?? "Choose a city"
                          }
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="addressLine1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street address</FormLabel>
                  <FormControl>
                    <Input placeholder="Shop no., building, street" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pincode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pincode</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" maxLength={6} placeholder="e.g. 110001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register("servesInStudio")} />
                In-studio
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register("servesAtHome")} />
                At-home service
              </label>
            </div>
            {servesAtHome && (
              <FormField
                control={form.control}
                name="homeServiceRadiusKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Home service radius (km)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        name={field.name}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        {step === 2 && (
          <FormField
            control={form.control}
            name="serviceCatalogIds"
            render={() => (
              <FormItem>
                <FormLabel>Which services do you offer?</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {serviceCatalog.map((entry) => {
                    const selected = selectedServices?.includes(entry.id);
                    return (
                      <Button
                        key={entry.id}
                        type="button"
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        onClick={() => {
                          const current = form.getValues("serviceCatalogIds");
                          form.setValue(
                            "serviceCatalogIds",
                            selected
                              ? current.filter((id) => id !== entry.id)
                              : [...current, entry.id],
                            { shouldValidate: true },
                          );
                        }}
                      >
                        {entry.name}
                      </Button>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Document upload (Aadhaar/PAN/GST/shop licence) is wired up once signed media uploads
              land later in the build. For now, just record your GST number if you have one —
              it&rsquo;ll show up correctly on your invoices.
            </p>
            <FormField
              control={form.control}
              name="gstin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GSTIN (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {step === 4 && (
          <FormField
            control={form.control}
            name="planCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Choose a plan</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Pick how long you want to stay listed — pricing and lead limits are fixed by
                  GlowMakeOver, never negotiable per vendor.
                </p>
                <PlanPicker plans={plans} value={field.value} onChange={field.onChange} />
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={goBack} disabled={step === 0}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={goNext}>
              Next
            </Button>
          ) : (
            // Deliberately type="button" + a manual handleSubmit() call, not
            // type="submit" — this button occupies the same slot as "Next"
            // above, and swapping a button's type to "submit" in the same
            // render pass as the click that revealed it races the browser's
            // native submit dispatch, silently submitting the form a step
            // early before the user ever saw the plan step.
            <Button
              type="button"
              onClick={form.handleSubmit(onSubmit)}
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? "Opening payment..."
                : selectedPlan
                  ? `Buy Now — ${formatPaiseAsINR(selectedPlan.pricePaise)}`
                  : "Buy Now"}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
