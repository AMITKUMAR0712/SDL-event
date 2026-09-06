import { auth } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const session = await auth();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-heading text-3xl">Admin</h1>
      <p className="mt-2 text-muted-foreground">
        Signed in as {session?.user.email} ({session?.user.role}).
      </p>
      <p className="mt-8 text-sm text-muted-foreground">
        KYC review, catalogue, plans, coupons, and settings land in Phase 6.
      </p>
    </main>
  );
}
