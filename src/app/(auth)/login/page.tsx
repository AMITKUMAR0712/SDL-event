import Link from "next/link";

import { AuthBrandPanel } from "@/components/shared/auth-brand-panel";
import { LoginForm } from "@/components/shared/login-form";
import { OtpLoginForm } from "@/components/shared/otp-login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  return (
    <main className="grid flex-1 grid-cols-1 lg:grid-cols-2">
      <AuthBrandPanel
        title="Welcome back to your beauty & banquet marketplace"
        body="Sign in to manage bookings, track your subscription, or find your next vendor."
      />

      <div className="flex items-center justify-center px-6 py-16">
        <Card className="w-full max-w-sm border-none shadow-lg">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to MakeGlowOver</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="password">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="password" className="flex-1">
                  Email
                </TabsTrigger>
                <TabsTrigger value="otp" className="flex-1">
                  Phone OTP
                </TabsTrigger>
              </TabsList>
              <TabsContent value="password">
                <LoginForm />
                <p className="mt-3 text-right text-sm">
                  <Link
                    href="/forgot-password"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Forgot password?
                  </Link>
                </p>
              </TabsContent>
              <TabsContent value="otp">
                <OtpLoginForm />
              </TabsContent>
            </Tabs>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              New to MakeGlowOver?{" "}
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
