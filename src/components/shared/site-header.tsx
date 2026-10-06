"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { signOutAction } from "@/server/actions/auth";

const DASHBOARD_LINK: Record<string, { href: string; label: string }> = {
  CUSTOMER: { href: "/account", label: "My account" },
  VENDOR: { href: "/dashboard/vendor", label: "Vendor dashboard" },
  BANQUET_OWNER: { href: "/dashboard/banquet", label: "Venue dashboard" },
  ADMIN: { href: "/dashboard/admin", label: "Admin dashboard" },
  SUPPORT: { href: "/dashboard/admin", label: "Admin dashboard" },
};

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/search", label: "All Services" },
  { href: "/#pricing", label: "Plans" },
  { href: "/contact", label: "Contact Us" },
] as const;

const NAV_LINK_CLASS =
  "relative py-1 text-muted-foreground transition-colors hover:text-foreground after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:scale-x-0 after:bg-primary after:transition-transform after:duration-200 hover:after:scale-x-100";

/**
 * Client-side on purpose: reading the session via `auth()` in a Server
 * Component here would make `cookies()` part of every page's render tree —
 * since this header is mounted in the root layout, that forced the entire
 * site (including pages with no auth-dependent content at all, like /terms
 * or /login) out of static rendering. `useSession()` fetches session state
 * client-side after the static HTML ships, so pages stay static/cacheable
 * and only the header itself updates once hydrated.
 */
export function SiteHeader() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const dashboard = session?.user ? DASHBOARD_LINK[session.user.role] : undefined;

  const authLinks =
    status === "authenticated" ? (
      <>
        {dashboard && (
          <Link
            href={dashboard.href}
            className="text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setMenuOpen(false)}
          >
            {session.user.name || dashboard.label}
          </Link>
        )}
        <form action={signOutAction}>
          <button
            type="submit"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "transition-transform hover:scale-105",
            })}
          >
            Sign out
          </button>
        </form>
      </>
    ) : status === "unauthenticated" ? (
      <>
        <Link
          href="/login"
          className="text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setMenuOpen(false)}
        >
          Login
        </Link>
        <Link
          href="/register"
          className={buttonVariants({
            size: "sm",
            className: "transition-transform hover:scale-105",
          })}
          onClick={() => setMenuOpen(false)}
        >
          Register
        </Link>
      </>
    ) : null; /* "loading" — avoid flashing the wrong state before the session resolves */

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-3">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80"
        >
          <Image
            src="/SajDhajLO_icon_C8AA78.png"
            alt=""
            width={32}
            height={32}
            className="size-8"
            priority
          />
          <span className="font-heading text-xl font-semibold tracking-tight">SajDhajLo</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={NAV_LINK_CLASS}>
              {link.label}
            </Link>
          ))}
        </nav>

        <nav className="ml-auto hidden items-center gap-3 text-sm md:flex">{authLinks}</nav>

        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="ml-auto flex size-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent md:hidden"
        >
          {menuOpen ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {menuOpen && (
        <nav className="animate-in fade-in slide-in-from-top-2 flex flex-col gap-1 border-t border-border px-6 py-3 text-sm duration-200 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-2 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex items-center gap-3 border-t border-border px-2 pt-3">
            {authLinks}
          </div>
        </nav>
      )}
    </header>
  );
}
