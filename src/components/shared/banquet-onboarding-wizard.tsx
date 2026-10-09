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
import { BanquetOnboardingInput, banquetOnboardingSchema } from "@/schemas/onboarding";
import { completeBanquetOnboardingAction } from "@/server/actions/onboarding";

const STORAGE_KEY = "onboarding:banquet";
const STEPS = ["Venue", "Location", "Pricing", "Documents", "Plan"] as const;

type Props = {
  cities: { id: string; name: string }[];
  plans: PlanPickerPlan[];
  accountName: string | null;
  accountEmail: string | null;
  accountPhone: string | null;
};

export function BanquetOnboardingWizard({
  cities,
  plans,
  accountName,
  accountEmail,
  accountPhone,
}: Props) {
  const router = useRouter();
  const { update } = useSession();
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<BanquetOnboardingInput>({
    resolver: zodResolver(banquetOnboardingSchema),
    defaultValues: {
      venueName: "",
      cityId: "",
      addressLine1: "",
      pincode: "",
      // Stored (and pre-filled here) as +91XXXXXXXXXX, but the field itself
      // takes a plain 10-digit number to match every other phone input in
      // the app — see bookingContactPhoneSchema.
      phone: accountPhone?.replace(/^\+91/, "") ?? "",
      totalHalls: 1,
      vegPricePerPlatePaise: 0,
      nonVegPricePerPlatePaise: 0,
      planCode: plans[0]?.code ?? "",
    },
  });

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

  const stepFields: (keyof BanquetOnboardingInput)[][] = [
    ["venueName", "totalHalls"],
    ["cityId", "addressLine1", "pincode", "phone"],
    ["vegPricePerPlatePaise", "nonVegPricePerPlatePaise"],
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

  async function onSubmit(values: BanquetOnboardingInput) {
    setServerError(null);
    const result = await completeBanquetOnboardingAction(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    await update(); // refresh the JWT so session.user.banquetId picks up the new profile

    if (result.data.subscriptionId) {
      // Publishing never waits on this — it only affects whether the new
      // subscription shows as paid on the dashboard afterwards.
      await chargeSubscriptionAtCheckout(result.data.subscriptionId);
    }

    router.push("/dashboard/banquet");
    router.refresh();
  }

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
              name="venueName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="totalHalls"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of halls</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={20}
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
                    <Input placeholder="Venue address, street, area" {...field} />
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
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue phone number</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="Your 10-digit mobile number"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="vegPricePerPlatePaise"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Veg price per plate (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
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
            <FormField
              control={form.control}
              name="nonVegPricePerPlatePaise"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Non-veg price per plate (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
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
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Document upload (GST/shop licence) is wired up once signed media uploads land later in
              the build — your listing goes live as soon as you finish this setup either way.
            </p>
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
                  SajDhajLo, never negotiable per venue.
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
