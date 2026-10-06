import Link from "next/link";

import { AuthBrandPanel } from "@/components/shared/auth-brand-panel";
import { LoginForm } from "@/components/shared/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="grid flex-1 grid-cols-1 lg:grid-cols-2">
      <AuthBrandPanel
        title="Welcome back to your beauty parlour & banquet marketplace"
        body="Sign in to manage bookings, track your subscription, or find your next vendor."
      />

      <div className="flex items-start justify-center overflow-y-auto px-6 py-10 sm:items-center sm:py-16">
        <Card className="w-full max-w-sm border-none shadow-lg">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to SajDhajLo</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
            <p className="mt-3 text-right text-sm">
              <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground">
                Forgot password?
              </Link>
            </p>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              New to SajDhajLo?{" "}
              <Link href="/register" className="font-medium text-foreground hover:underline">
                Create an account
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
