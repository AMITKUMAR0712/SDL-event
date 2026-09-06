import Link from "next/link";

import { LoginForm } from "@/components/shared/login-form";
import { OtpLoginForm } from "@/components/shared/otp-login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-sm">
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
    </main>
  );
}
