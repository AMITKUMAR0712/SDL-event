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
import { VendorProfileEditInput, vendorProfileEditSchema } from "@/schemas/profile";
import { updateVendorProfileAction } from "@/server/actions/profile";

type Props = {
  cities: { id: string; name: string }[];
  initialValues: VendorProfileEditInput;
};

export function VendorProfileEditForm({ cities, initialValues }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const form = useForm<VendorProfileEditInput>({
    resolver: zodResolver(vendorProfileEditSchema),
    defaultValues: initialValues,
  });

  const servesAtHome = form.watch("servesAtHome");

  async function onSubmit(values: VendorProfileEditInput) {
    setServerError(null);
    setSaved(false);
    const result = await updateVendorProfileAction(values);
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
                      {(value: string | null) => cities.find((city) => city.id === value)?.name}
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
