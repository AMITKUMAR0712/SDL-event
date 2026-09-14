import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border px-6 py-8 text-sm text-muted-foreground">
      <nav aria-label="Legal" className="mx-auto flex max-w-5xl flex-wrap gap-x-6 gap-y-2">
        <Link href="/terms" className="hover:underline">
          Terms of Service
        </Link>
        <Link href="/privacy" className="hover:underline">
          Privacy Policy
        </Link>
        <Link href="/refund-policy" className="hover:underline">
          Refund & Cancellation Policy
        </Link>
        <Link href="/contact" className="hover:underline">
          Contact Us
        </Link>
      </nav>
      <p className="mx-auto mt-4 max-w-5xl">
        © {new Date().getFullYear()} GlowMakeOver. All rights reserved.
      </p>
      <p className="mx-auto mt-1 max-w-5xl">
        Developed by TradeOrbit Global —{" "}
        <a
          href="https://www.bestdigitalmarket.in"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          www.bestdigitalmarket.in
        </a>
      </p>
    </footer>
  );
}
