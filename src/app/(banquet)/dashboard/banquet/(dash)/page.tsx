import Link from "next/link";

import { SubscriptionPayButton } from "@/components/shared/subscription-pay-button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPaiseAsINR } from "@/lib/money";
import { isSubscriptionExpired } from "@/lib/subscription-status";
import { syncPublishStatusForUser } from "@/server/services/subscription";

const BILLING_PERIOD_LABEL: Record<string, string> = {
  MONTHLY: "/ month",
  QUARTERLY: "for 3 months",
  HALF_YEARLY: "for 6 months",
  YEARLY: "for 12 months",
};

export default async function BanquetDashboardPage() {
  const session = await auth();
  if (session?.user.id) await syncPublishStatusForUser(session.user.id);
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
        <Link
          href="/dashboard/banquet/onboarding"
          className="mt-6 inline-block text-primary underline"
        >
          Continue onboarding
        </Link>
      </main>
    );
  }

  const subscription = session?.user.id
    ? await db.subscription.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        include: { plan: true, payments: { where: { status: "CAPTURED" }, take: 1 } },
      })
    : null;
  const isPaid = (subscription?.payments.length ?? 0) > 0;
  const isExpired = isSubscriptionExpired(subscription);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl">{banquet.venueName}</h1>
          <p className="mt-2 text-muted-foreground">
            KYC status: {banquet.kycStatus} ·{" "}
            {banquet.isPublished
              ? "Published"
              : isExpired
                ? "Unpublished — plan expired"
                : "Not published yet"}
          </p>
        </div>
        <Link
          href="/dashboard/banquet/profile"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Edit profile
        </Link>
      </div>

      {subscription && (
        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Your plan
          </p>
          <p className="mt-1 text-xl font-semibold">{subscription.plan.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatPaiseAsINR(subscription.priceSnapshotPaise)}{" "}
            {BILLING_PERIOD_LABEL[subscription.plan.billingPeriod] ?? ""} · Renews/expires{" "}
            {subscription.currentPeriodEnd.toLocaleDateString("en-IN")}
          </p>
          <p className="mt-2 text-sm">
            Payment status:{" "}
            <span className={isPaid ? "text-primary" : "text-amber-600"}>
              {isPaid ? "Paid" : "Payment pending"}
            </span>
          </p>
          {!isPaid && (
            <div className="mt-3">
              <SubscriptionPayButton subscriptionId={subscription.id} />
            </div>
          )}
        </div>
      )}

      <p className="mt-8 text-sm text-muted-foreground">
        Halls, bookings, calendar, and payouts land in Phases 3-5.
      </p>
    </main>
  );
}
