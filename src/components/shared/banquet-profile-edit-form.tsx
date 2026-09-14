"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { BanquetProfileEditInput, banquetProfileEditSchema } from "@/schemas/profile";
import { updateBanquetProfileAction } from "@/server/actions/profile";

type Props = {
  cities: { id: string; name: string }[];
  initialValues: BanquetProfileEditInput;
};

export function BanquetProfileEditForm({ cities, initialValues }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const form = useForm<BanquetProfileEditInput>({
    resolver: zodResolver(banquetProfileEditSchema),
    defaultValues: initialValues,
  });

  async function onSubmit(values: BanquetProfileEditInput) {
    setServerError(null);
    setSaved(false);
    const result = await updateBanquetProfileAction(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        {saved && (
          <Alert>
            <AlertDescription>Profile updated.</AlertDescription>
          </Alert>
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

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </Form>
  );
}
