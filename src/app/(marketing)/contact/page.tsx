import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "How to reach GlowMakeOver support, our grievance officer, and business inquiries.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-heading text-3xl">Contact Us</h1>

      <section className="mt-8">
        <h2 className="font-heading text-xl">Phone</h2>
        <p className="mt-2 text-muted-foreground">
          <a href="tel:+919992196879" className="hover:underline">
            +91 99921 96879
          </a>
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-xl">Email</h2>
        <p className="mt-2 text-muted-foreground">
          <a href="mailto:glowmakeoverit@gmail.com" className="hover:underline">
            glowmakeoverit@gmail.com
          </a>
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-xl">Grievance officer (DPDP Act, 2023)</h2>
        <p className="mt-2 text-muted-foreground">
          For data-privacy requests and grievances, reach us at the email above.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-xl">Registered office</h2>
        <p className="mt-2 text-muted-foreground">
          TradeOrbit Global, Best Digital Market, C Block, Block C, Sector MU 1
          <br />
          Greater Noida, Mathurapur, Uttar Pradesh 201310
        </p>
      </section>
    </main>
  );
}
