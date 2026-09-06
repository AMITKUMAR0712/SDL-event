import Link from "next/link";

import { AuthBrandPanel } from "@/components/shared/auth-brand-panel";
import { RegisterForm } from "@/components/shared/register-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <main className="grid flex-1 grid-cols-1 lg:grid-cols-2">
      <AuthBrandPanel
        title="Join thousands finding their perfect vendor"
        body="Whether you're planning a wedding or growing your salon business, GlowMakeOver connects you with the right people."
      />

      <div className="flex items-center justify-center px-6 py-16">
        <Card className="w-full max-w-sm border-none shadow-lg">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Create your account</CardTitle>
            <CardDescription>Join GlowMakeOver in under a minute</CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-foreground hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
