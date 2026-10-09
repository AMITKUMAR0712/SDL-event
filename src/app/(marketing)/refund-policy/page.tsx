import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description: "When a booking or subscription on SajDhajLo qualifies for a refund.",
};

export default function RefundPolicyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 [&_a]:underline [&_h2]:mt-8 [&_h2]:font-heading [&_h2]:text-xl [&_li]:mt-1 [&_p]:mt-2 [&_p]:text-muted-foreground [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="font-heading text-3xl">Refund &amp; Cancellation Policy</h1>
      <p className="text-muted-foreground">Last updated: 9 October 2026</p>

      <h2>Bookings</h2>
      <p>
        If you cancel a booking, the eligible refund is based on the time remaining until the
        scheduled appointment:
      </p>
      <ul>
        <li>
          <strong>24 hours or more before</strong> the scheduled time: full refund.
        </li>
        <li>
          <strong>At least 4 hours but less than 24 hours before</strong>: 50% refund.
        </li>
        <li>
          <strong>Less than 4 hours before</strong>: no refund.
        </li>
      </ul>
      <p>
        If a vendor or venue cancels your booking, you are eligible for a full refund regardless of
        timing. A vendor/venue no-show is not treated as a vendor cancellation under these automatic
        time bands; contact us with your booking number so we can review the case.
      </p>

      <h2>Subscriptions</h2>
      <p>
        Vendor, venue, and customer subscriptions are one-time payments for the selected plan
        period. They do not automatically renew; another payment is required to continue access
        after the current period ends. A subscription payment is non-refundable once its period has
        started, except where a refund is required by applicable law or an incorrect/duplicate
        charge needs correction.
      </p>

      <h2>How to request a refund</h2>
      <p>
        Cancel a booking from <em>My Bookings</em>. Cancellation records the eligible refund amount
        but does not automatically send money back to your payment method. To request processing,
        contact us through the <Link href="/contact">Contact page</Link> with your booking number.
        Our support team reviews the request and, if approved, manually initiates the refund through
        the payment provider to the original payment method. Your bank or payment provider controls
        the time it takes for the credit to appear.
      </p>
    </main>
  );
}
