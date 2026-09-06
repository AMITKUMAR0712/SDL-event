import Link from "next/link";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function VendorDashboardPage() {
  const session = await auth();
  // Looked up by the stable userId, not session.user.vendorId — that field is
  // only refreshed on sign-in or an explicit session update() and would
  // otherwise show a stale "not onboarded" state right after onboarding.
  const vendor = session?.user.id
    ? await db.vendorProfile.findUnique({ where: { userId: session.user.id } })
    : null;

  if (!vendor) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="font-heading text-3xl">Finish setting up your business</h1>
        <p className="mt-2 text-muted-foreground">You haven&apos;t completed onboarding yet.</p>
        <Link href="/vendor/onboarding" className="mt-6 inline-block text-primary underline">
          Continue onboarding
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-heading text-3xl">{vendor.businessName}</h1>
      <p className="mt-2 text-muted-foreground">
        KYC status: {vendor.kycStatus} · {vendor.isPublished ? "Published" : "Not published yet"}
      </p>
      <p className="mt-8 text-sm text-muted-foreground">
        Services, bookings, availability, and payouts land in Phases 3-5.
      </p>
    </main>
  );
}
