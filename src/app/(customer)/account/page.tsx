import Link from "next/link";

import { auth } from "@/lib/auth";

export default async function AccountPage() {
  const session = await auth();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-heading text-3xl">My account</h1>
      <p className="mt-2 text-muted-foreground">
        Signed in as {session?.user.email ?? session?.user.name}.
      </p>
      <Link href="/account/bookings" className="mt-6 inline-block text-primary underline">
        View my bookings
      </Link>
      <p className="mt-8 text-sm text-muted-foreground">
        Subscription management and saved addresses land in Phase 5.
      </p>
    </main>
  );
}
