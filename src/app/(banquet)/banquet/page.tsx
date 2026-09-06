import Link from "next/link";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function BanquetDashboardPage() {
  const session = await auth();
  // Looked up by the stable userId, not session.user.banquetId — that field
  // is only refreshed on sign-in or an explicit session update() and would
  // otherwise show a stale "not onboarded" state right after onboarding.
  const banquet = session?.user.id
    ? await db.banquetProfile.findUnique({ where: { userId: session.user.id } })
    : null;

  if (!banquet) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="font-heading text-3xl">Finish setting up your venue</h1>
        <p className="mt-2 text-muted-foreground">You haven&apos;t completed onboarding yet.</p>
        <Link href="/banquet/onboarding" className="mt-6 inline-block text-primary underline">
          Continue onboarding
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-heading text-3xl">{banquet.venueName}</h1>
      <p className="mt-2 text-muted-foreground">
        KYC status: {banquet.kycStatus} · {banquet.isPublished ? "Published" : "Not published yet"}
      </p>
      <p className="mt-8 text-sm text-muted-foreground">
        Halls, bookings, calendar, and payouts land in Phases 3-5.
      </p>
    </main>
  );
}
