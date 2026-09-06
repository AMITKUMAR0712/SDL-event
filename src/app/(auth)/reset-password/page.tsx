import { ResetPasswordForm } from "@/components/shared/reset-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ResetPasswordPage(props: PageProps<"/reset-password">) {
  const params = await props.searchParams;
  const email = typeof params.email === "string" ? params.email : "";
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Set a new password</CardTitle>
          <CardDescription>Choose a strong password for your account</CardDescription>
        </CardHeader>
        <CardContent>
          {email && token ? (
            <ResetPasswordForm email={email} token={token} />
          ) : (
            <p className="text-sm text-destructive">
              This reset link is missing information. Request a new one from the login page.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
