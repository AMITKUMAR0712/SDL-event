import { MessageCircle, Phone } from "lucide-react";

import { ContactForm } from "@/components/shared/contact-form";

export default function VendorContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-heading text-3xl">Contact Us</h1>
      <p className="mt-2 text-muted-foreground">
        Need help with your listing, subscription, or a booking? Reach out any of these ways.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <a
          href="https://wa.me/919992196879?text=Hi!%20I%20need%20help%20with%20my%20GlowMakeOver%20vendor%20account."
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-border p-4 hover:bg-accent"
        >
          <MessageCircle className="size-5 text-primary" aria-hidden="true" />
          <div>
            <p className="font-medium">WhatsApp</p>
            <p className="text-sm text-muted-foreground">+91 99921 96879</p>
          </div>
        </a>
        <a
          href="tel:+919992196879"
          className="flex items-center gap-3 rounded-xl border border-border p-4 hover:bg-accent"
        >
          <Phone className="size-5 text-primary" aria-hidden="true" />
          <div>
            <p className="font-medium">Call us</p>
            <p className="text-sm text-muted-foreground">+91 99921 96879</p>
          </div>
        </a>
        <a
          href="mailto:glowmakeoverit@gmail.com"
          className="flex items-center gap-3 rounded-xl border border-border p-4 hover:bg-accent sm:col-span-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="size-5 text-primary"
            aria-hidden="true"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-10 6L2 7" />
          </svg>
          <div>
            <p className="font-medium">Email</p>
            <p className="text-sm text-muted-foreground">glowmakeoverit@gmail.com</p>
          </div>
        </a>
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-xl">Send us a message</h2>
        <div className="mt-4 max-w-lg">
          <ContactForm />
        </div>
      </div>
    </main>
  );
}
