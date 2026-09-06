import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description: "When a booking or subscription on GlowMakeOver qualifies for a refund.",
};

export default function RefundPolicyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 [&_a]:underline [&_h2]:mt-8 [&_h2]:font-heading [&_h2]:text-xl [&_li]:mt-1 [&_p]:mt-2 [&_p]:text-muted-foreground [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="font-heading text-3xl">Refund &amp; Cancellation Policy</h1>
      <p className="text-muted-foreground">Last updated: 6 September 2026</p>

      <h2>Bookings</h2>
      <p>
        Refunds for a cancelled booking depend on how far in advance you cancel, relative to the
        scheduled time (this platform default can be adjusted by GlowMakeOver from time to time; the
        version in effect at the time of your booking applies):
      </p>
      <ul>
        <li>
          <strong>24 hours or more before</strong> the scheduled time: full refund.
        </li>
        <li>
          <strong>4–24 hours before</strong>: 50% refund.
        </li>
        <li>
          <strong>Less than 4 hours before</strong>: no refund.
        </li>
      </ul>
      <p>
        If a vendor or venue cancels a confirmed booking, or fails to show up, you receive a full
        refund regardless of timing. Refunds are issued to the original payment method via Razorpay
        and typically settle within 5–7 business days, depending on your bank.
      </p>

      <h2>Subscriptions</h2>
      <p>
        Vendor, venue, and customer subscriptions are billed per period (monthly/quarterly/annual,
        depending on the plan) and are non-refundable once the period has started, since the listing
        visibility or unlock quota for that period has already been granted. You can cancel
        auto-renewal at any time to stop future charges; access continues until the end of the
        period you already paid for.
      </p>

      <h2>How to request a refund</h2>
      <p>
        Cancel directly from <em>My Bookings</em> or <em>My Subscription</em> in your account —
        eligible refunds are initiated automatically. For a dispute about a refund amount, contact
        us via the <Link href="/contact">Contact page</Link> with your booking number.
      </p>
    </main>
  );
}
