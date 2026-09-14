import Link from "next/link";

import { ExpireSubscriptionsButton } from "@/components/shared/expire-subscriptions-button";
import { auth } from "@/lib/auth";
import { formatPaiseAsINR } from "@/lib/money";
import { getDashboardMetrics } from "@/server/repositories/admin";

export default async function AdminDashboardPage() {
  const session = await auth();
  const metrics = await getDashboardMetrics();

  const cards = [
    { label: "Total users", value: metrics.totalUsers },
    { label: "Active vendor subs", value: metrics.activeVendorSubs },
    { label: "Active banquet subs", value: metrics.activeBanquetSubs },
    { label: "Active customer subs", value: metrics.activeCustomerSubs },
    { label: "Total bookings", value: metrics.totalBookings },
    { label: "Completed bookings", value: metrics.completedBookings },
    { label: "GMV (completed)", value: formatPaiseAsINR(metrics.gmvPaise) },
    {
      label: "Pending KYC",
      value: metrics.pendingVendorKyc + metrics.pendingBanquetKyc,
      href: "/dashboard/admin/kyc",
    },
  ];

  const links = [
    { href: "/dashboard/admin/kyc", label: "KYC review" },
    { href: "/dashboard/admin/coupons", label: "Coupons" },
    { href: "/dashboard/admin/settings", label: "Settings" },
    { href: "/dashboard/admin/users", label: "Users" },
    { href: "/dashboard/admin/bookings", label: "Bookings" },
    { href: "/dashboard/admin/audit-log", label: "Audit log" },
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-heading text-3xl">Admin</h1>
      <p className="mt-2 text-muted-foreground">
        Signed in as {session?.user.email} ({session?.user.role}).
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border p-4">
            <p className="text-2xl font-semibold">{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <nav className="mt-8 flex flex-wrap gap-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8 rounded-lg border border-border p-4">
        <p className="text-sm font-medium">Subscription expiry</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Vendors/banquets past their plan&rsquo;s end date are unpublished automatically on their
          next dashboard or profile page visit. Run this to sweep the rest right now (also runs
          daily via cron once one is configured).
        </p>
        <div className="mt-3">
          <ExpireSubscriptionsButton />
        </div>
      </div>
    </main>
  );
}
