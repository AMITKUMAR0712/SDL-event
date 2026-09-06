import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "How to reach MakeGlowOver support, our grievance officer, and business inquiries.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-heading text-3xl">Contact Us</h1>

      <section className="mt-8">
        <h2 className="font-heading text-xl">Customer & vendor support</h2>
        <p className="mt-2 text-muted-foreground">support@makeglowover.com</p>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-xl">Grievance officer (DPDP Act, 2023)</h2>
        <p className="mt-2 text-muted-foreground">
          For data-privacy requests and grievances: privacy@makeglowover.com
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-xl">Business & press inquiries</h2>
        <p className="mt-2 text-muted-foreground">hello@makeglowover.com</p>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-xl">Registered office</h2>
        <p className="mt-2 text-muted-foreground">
          MakeGlowOver, New Delhi, India
          <br />
          (Full registered address to be added on incorporation.)
        </p>
      </section>
    </main>
  );
}
