import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What personal data SajDhajLo collects, why, and your rights under India's DPDP Act.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 [&_a]:underline [&_h2]:mt-8 [&_h2]:font-heading [&_h2]:text-xl [&_li]:mt-1 [&_p]:mt-2 [&_p]:text-muted-foreground [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="font-heading text-3xl">Privacy Policy</h1>
      <p className="text-muted-foreground">Last updated: 6 September 2026</p>

      <h2>1. Data we collect</h2>
      <ul>
        <li>
          Account data: name, email, phone number, password (stored as a salted hash, never in plain
          text).
        </li>
        <li>
          Booking data: services booked, scheduled dates, addresses you provide for at-home service.
        </li>
        <li>
          Vendor/venue KYC data: business name, GSTIN, PAN (masked after verification), and the
          documents you upload for approval.
        </li>
        <li>
          Payment data: Razorpay processes and stores your card/UPI/bank details directly — we only
          receive the payment outcome and a masked reference.
        </li>
        <li>
          Usage data: pages viewed, searches made, and device/browser information, to keep the
          service secure and improve ranking relevance.
        </li>
      </ul>

      <h2>2. Why we collect it</h2>
      <p>
        To create and secure your account, process bookings and payments, verify vendor/venue KYC,
        send booking and account notifications, prevent fraud and abuse, and meet our tax and
        accounting obligations under Indian law.
      </p>

      <h2>3. Who we share it with</h2>
      <p>
        We share only what each provider needs to do its job: Razorpay (payments), MSG91 (SMS/OTP
        delivery), Resend (email delivery), Cloudinary (media storage), and, if you contact us via
        WhatsApp, Meta&rsquo;s WhatsApp Cloud API. We do not sell personal data.
      </p>

      <h2>4. Your rights under the DPDP Act, 2023</h2>
      <p>As a data principal under India&rsquo;s Digital Personal Data Protection Act, you may:</p>
      <ul>
        <li>
          Request a summary of the personal data we hold about you and how it&rsquo;s processed.
        </li>
        <li>Request correction or completion of inaccurate or incomplete data.</li>
        <li>
          Request erasure of your data, once it&rsquo;s no longer needed for the purpose collected
          or required by law (e.g. tax records).
        </li>
        <li>
          Withdraw consent for processing that relies on it, and nominate someone to exercise these
          rights on your behalf in the event of death or incapacity.
        </li>
        <li>
          Register a grievance with us, and escalate to the Data Protection Board of India if
          unresolved.
        </li>
      </ul>
      <p>
        To exercise any of these, reach our grievance officer via the{" "}
        <Link href="/contact">Contact page</Link>.
      </p>

      <h2>5. Retention</h2>
      <p>
        We keep booking and payment records for as long as Indian tax law requires (currently up to
        8 years for GST-relevant records), and other account data for as long as your account is
        active plus a reasonable period after closure to resolve disputes.
      </p>

      <h2>6. Cookies</h2>
      <p>
        We use strictly necessary cookies to keep you signed in and to enforce the free-search quota
        described on our search pages. We do not use third-party advertising cookies.
      </p>

      <h2>7. Security</h2>
      <p>
        Passwords are hashed, never stored in plain text. Every admin action is logged with who did
        it, when, and what changed. Report a suspected security issue via the{" "}
        <Link href="/contact">Contact page</Link>.
      </p>
    </main>
  );
}
