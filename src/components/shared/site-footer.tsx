"use client";

import { Mail, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const LINK_CLASS = "transition-colors hover:text-foreground hover:underline";

const QUICK_LINKS = [
  { href: "/", label: "Home" },
  { href: "/search", label: "All Services" },
  { href: "/#pricing", label: "Plans" },
  { href: "/contact", label: "Contact Us" },
  { href: "/register", label: "Register as a vendor" },
] as const;

const SERVICE_LINKS = [
  { href: "/search?type=vendor", label: "Beauty Parlour & Salons" },
  { href: "/search?type=banquet", label: "Banquets for Weddings & Parties" },
  { href: "/categories/bridal-makeup", label: "Bridal Makeup" },
  { href: "/categories/banquet-halls", label: "Banquet Halls" },
] as const;

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund-policy", label: "Refund & Cancellation Policy" },
] as const;

/** Fades a section in the first time it scrolls into view — plain
 * IntersectionObserver rather than a new dependency, per CLAUDE.md §3. */
function FadeInSection({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"} ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-accent/20 text-sm text-muted-foreground">
      <FadeInSection className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <Image
                src="/SajDhajLO_icon_C8AA78.png"
                alt=""
                width={32}
                height={32}
                className="size-8"
              />
              <span className="font-heading text-lg font-semibold text-foreground">SajDhajLo</span>
            </Link>
            <p className="mt-3 max-w-xs">
              India&apos;s marketplace for trusted beauty parlours and banquet venues — compare,
              book, and celebrate with confidence.
            </p>
            <ul className="mt-4 space-y-2">
              <li>
                <a
                  href="tel:+919992196879"
                  className="flex items-center gap-2 transition-colors hover:text-foreground"
                >
                  <Phone className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  +91 99921 96879
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@sajdhajlo.com"
                  className="flex items-center gap-2 transition-colors hover:text-foreground"
                >
                  <Mail className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  info@sajdhajlo.com
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>Greater Noida, Uttar Pradesh 201310</span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-heading text-sm font-semibold text-foreground uppercase">
              Quick Links
            </h2>
            <ul className="mt-4 space-y-2">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK_CLASS}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-heading text-sm font-semibold text-foreground uppercase">
              Services
            </h2>
            <ul className="mt-4 space-y-2">
              {SERVICE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK_CLASS}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-heading text-sm font-semibold text-foreground uppercase">Legal</h2>
            <ul className="mt-4 space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK_CLASS}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-1 border-t border-border pt-6">
          <p>© {new Date().getFullYear()} SajDhajLo. All rights reserved.</p>
          <p>
            Developed by TradeOrbit Global —{" "}
            <a
              href="https://www.bestdigitalmarket.in"
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLASS}
            >
              www.bestdigitalmarket.in
            </a>
          </p>
        </div>
      </FadeInSection>
    </footer>
  );
}
