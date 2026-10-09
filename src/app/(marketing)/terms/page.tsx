import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern using SajDhajLo as a customer, vendor, or venue owner.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 [&_a]:underline [&_h2]:mt-8 [&_h2]:font-heading [&_h2]:text-xl [&_li]:mt-1 [&_p]:mt-2 [&_p]:text-muted-foreground [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="font-heading text-3xl">Terms of Service</h1>
      <p className="text-muted-foreground">Last updated: 9 October 2026</p>

      <h2>1. What SajDhajLo is</h2>
      <p>
        SajDhajLo is a marketplace connecting customers with independent beauty vendors and
        banquet/venue owners across India. We do not employ vendors or own venues — each listing is
        an independent business responsible for the service or venue it provides. SajDhajLo is
        operated by Amit Kumar as a sole proprietorship. Our business contact details are available
        on the <Link href="/contact">Contact page</Link>.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You must provide accurate information when registering and keep your login credentials
        confidential. You&rsquo;re responsible for activity under your account. We may suspend
        accounts that violate these terms or applicable law.
      </p>

      <h2>3. Bookings and payments</h2>
      <p>
        When you book a vendor or venue, the service is provided by that independent vendor or
        venue. SajDhajLo facilitates discovery, booking and payment. Prices and any applicable taxes
        are shown before you pay. Amounts are charged in Indian Rupees (INR). Payments are currently
        processed through Cashfree; SajDhajLo does not store your card, UPI or bank credentials.
      </p>

      <h2>4. Cancellations and refunds</h2>
      <p>
        See our <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link> for the windows
        and amounts that apply to cancelling a booking or a subscription.
      </p>

      <h2>5. Vendor and venue obligations</h2>
      <p>
        Vendors and venue owners listed on SajDhajLo must hold any licenses their business requires,
        honor confirmed bookings, and keep their KYC information (including GSTIN, where applicable)
        accurate and current. We may remove a listing that fails KYC review or receives credible
        complaints of fraud or unsafe conduct.
      </p>

      <h2>6. Subscriptions</h2>
      <p>
        Vendor, venue, and customer subscriptions are one-time payments for the period selected at
        checkout. They do not automatically renew or create recurring payment mandates; to continue
        access after the period ends, make a new payment. The available plans, features and prices
        are shown before purchase and may change for future purchases. A price change does not alter
        a period already paid for.
      </p>

      <h2>7. Prohibited conduct</h2>
      <p>
        You may not use SajDhajLo to circumvent platform fees by arranging payment outside the
        platform for a booking made through it, post false reviews, scrape the platform, or
        misrepresent your identity, pricing, or qualifications.
      </p>

      <h2>8. Liability</h2>
      <p>
        SajDhajLo is not liable for the quality, safety, or legality of services or venues listed by
        vendors and venue owners, who remain independently responsible for what they provide. To the
        extent permitted by Indian law, our liability for any claim is limited to the amount you
        paid us for the booking or subscription giving rise to that claim.
      </p>

      <h2>9. Governing law</h2>
      <p>
        These terms are governed by the laws of India. Disputes are subject to the exclusive
        jurisdiction of the courts at New Delhi.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about these terms: see our <Link href="/contact">Contact page</Link>.
      </p>
    </main>
  );
}
