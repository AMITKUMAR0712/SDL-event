import type { Metadata } from "next";

import { ContactForm } from "@/components/shared/contact-form";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "How to reach SajDhajLo support, the business operator, and privacy requests.",
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
              <a href="mailto:info@sajdhajlo.com" className="hover:underline">
                info@sajdhajlo.com
              </a>
            </p>
          </section>

          <section className="mt-8">
            <h2 className="font-heading text-xl">Business operator</h2>
            <p className="mt-2 text-muted-foreground">
              SajDhajLo is operated by Amit Kumar as a sole proprietorship.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="font-heading text-xl">Business address</h2>
            <p className="mt-2 text-muted-foreground">
              C-317, C Block, Best Digital Market, Sector MU-1
              <br />
              Greater Noida, Uttar Pradesh 201310
            </p>
          </section>

          <section className="mt-8 rounded-xl border border-border bg-accent/40 p-4">
            <h2 className="font-heading text-lg">Grievance and privacy contact</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Contact Amit Kumar at{" "}
              <a href="mailto:info@sajdhajlo.com" className="underline">
                info@sajdhajlo.com
              </a>{" "}
              or +91 99921 96879. Include your account email and booking number, if applicable.
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
