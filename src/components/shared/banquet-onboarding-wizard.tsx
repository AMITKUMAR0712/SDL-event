"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

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
import { BanquetOnboardingInput, banquetOnboardingSchema } from "@/schemas/onboarding";
import { completeBanquetOnboardingAction } from "@/server/actions/onboarding";

const STORAGE_KEY = "onboarding:banquet";
const STEPS = ["Venue", "Location", "Pricing", "Documents", "Plan"] as const;

type Props = {
  cities: { id: string; name: string }[];
  plans: { id: string; code: string; name: string; pricePaise: number; trialDays: number }[];
};

export function BanquetOnboardingWizard({ cities, plans }: Props) {
  const router = useRouter();
  const { update } = useSession();
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<BanquetOnboardingInput>({
    resolver: zodResolver(banquetOnboardingSchema),
    defaultValues: {
      venueName: "",
      cityId: "",
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
    ["cityId"],
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
    router.push("/banquet");
    router.refresh();
  }

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
          <FormField
            control={form.control}
            name="cityId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a city" />
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
              the build. An admin will follow up with you directly to verify your documents before
              your listing goes live.
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
                <div className="space-y-2">
                  {plans.map((plan) => (
                    <label
                      key={plan.code}
                      className="flex items-center justify-between rounded-lg border border-border p-3 text-sm has-[:checked]:border-primary"
                    >
                      <span>
                        {plan.name}
                        {plan.trialDays > 0 && (
                          <span className="text-muted-foreground">
                            {" "}
                            · {plan.trialDays}-day trial
                          </span>
                        )}
                      </span>
                      <input
                        type="radio"
                        value={plan.code}
                        checked={field.value === plan.code}
                        onChange={() => field.onChange(plan.code)}
                      />
                    </label>
                  ))}
                </div>
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
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Submitting..." : "Finish setup"}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
