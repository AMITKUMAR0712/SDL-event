"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
import { RegisterInput, registerSchema } from "@/schemas/auth";
import { registerAction } from "@/server/actions/auth";

const ROLE_REDIRECT: Record<string, string> = {
  CUSTOMER: "/account",
  VENDOR: "/dashboard/vendor/onboarding",
  BANQUET_OWNER: "/dashboard/banquet/onboarding",
};

const ROLE_LABEL: Record<string, string> = {
  CUSTOMER: "Customer, booking a service",
  VENDOR: "Beauty vendor / salon / artist",
  BANQUET_OWNER: "Banquet / venue owner",
};

export function RegisterForm() {
  const router = useRouter();
  const { update } = useSession();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", role: "CUSTOMER" },
  });

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    const result = await registerAction(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    // useSession() only refetches on window focus/its poll interval by
    // default — without this, the navbar (which reads it client-side)
    // would keep showing "Login/Register" until the user clicked away and
    // back, even though they're already signed in.
    await update();
    router.push(ROLE_REDIRECT[result.data.role] ?? "/account");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>I am a...</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string | null) => ROLE_LABEL[value ?? ""] ?? "Choose a role"}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="CUSTOMER">{ROLE_LABEL.CUSTOMER}</SelectItem>
                  <SelectItem value="VENDOR">{ROLE_LABEL.VENDOR}</SelectItem>
                  <SelectItem value="BANQUET_OWNER">{ROLE_LABEL.BANQUET_OWNER}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </Form>
  );
}
