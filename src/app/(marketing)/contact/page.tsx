import type { Metadata } from "next";

import { ContactForm } from "@/components/shared/contact-form";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "How to reach GlowMakeOver support, our grievance officer, and business inquiries.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-heading text-3xl">Contact Us</h1>

      <div className="mt-8 grid gap-10 md:grid-cols-2">
        <div>
          <section>
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

          <section className="mt-8 rounded-xl border border-border bg-accent/40 p-4">
            <h2 className="font-heading text-lg">Need a website, app, or custom software?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              GlowMakeOver is built by <strong>TradeOrbit Global Pvt Ltd</strong>. If your business
              needs a website, mobile app, or custom software, you can reach out to the same team
              using the details above.
            </p>
          </section>
        </div>

        <section>
          <h2 className="font-heading text-xl">Send us a message</h2>
          <div className="mt-4">
            <ContactForm />
          </div>
        </section>
      </div>
    </main>
  );
}
