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
import { RequestOtpInput, requestOtpSchema, VerifyOtpInput, verifyOtpSchema } from "@/schemas/auth";
import { requestOtpAction, verifyOtpAction } from "@/server/actions/auth";

export function OtpLoginForm() {
  const router = useRouter();
  const [stage, setStage] = useState<"request" | "verify">("request");
  const [phone, setPhone] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const requestForm = useForm<RequestOtpInput>({
    resolver: zodResolver(requestOtpSchema),
    defaultValues: { phone: "+91" },
  });

  const verifyForm = useForm<VerifyOtpInput>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { phone: "", code: "" },
  });

  async function onRequestOtp(values: RequestOtpInput) {
    setServerError(null);
    const result = await requestOtpAction(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    setPhone(values.phone);
    verifyForm.setValue("phone", values.phone);
    setStage("verify");
  }

  async function onVerifyOtp(values: VerifyOtpInput) {
    setServerError(null);
    const result = await verifyOtpAction(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    router.push("/account");
    router.refresh();
  }

  if (stage === "request") {
    return (
      <Form {...requestForm}>
        <form onSubmit={requestForm.handleSubmit(onRequestOtp)} className="space-y-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          <FormField
            control={requestForm.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile number</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="+919876543210" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={requestForm.formState.isSubmitting}>
            {requestForm.formState.isSubmitting ? "Sending..." : "Send OTP"}
          </Button>
        </form>
      </Form>
    );
  }

  return (
    <Form {...verifyForm}>
      <form onSubmit={verifyForm.handleSubmit(onVerifyOtp)} className="space-y-4">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to {phone}.</p>
        <FormField
          control={verifyForm.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>OTP code</FormLabel>
              <FormControl>
                <Input inputMode="numeric" maxLength={6} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={verifyForm.formState.isSubmitting}>
          {verifyForm.formState.isSubmitting ? "Verifying..." : "Verify and sign in"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => setStage("request")}
        >
          Use a different number
        </Button>
      </form>
    </Form>
  );
}
