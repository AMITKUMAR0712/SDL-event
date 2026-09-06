"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

import { buttonVariants } from "@/components/ui/button";
import { signOutAction } from "@/server/actions/auth";

const DASHBOARD_LINK: Record<string, { href: string; label: string }> = {
  CUSTOMER: { href: "/account", label: "My account" },
  VENDOR: { href: "/dashboard/vendor", label: "Vendor dashboard" },
  BANQUET_OWNER: { href: "/dashboard/banquet", label: "Venue dashboard" },
  ADMIN: { href: "/dashboard/admin", label: "Admin dashboard" },
  SUPPORT: { href: "/dashboard/admin", label: "Admin dashboard" },
};

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
  const dashboard = session?.user ? DASHBOARD_LINK[session.user.role] : undefined;

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-heading text-xl font-semibold tracking-tight">
          GlowMakeOver
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          <Link href="/search" className="text-muted-foreground hover:text-foreground">
            Search
          </Link>

          {
            status === "authenticated" ? (
              <>
                {dashboard && (
                  <Link
                    href={dashboard.href}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {dashboard.label}
                  </Link>
                )}
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : status === "unauthenticated" ? (
              <>
                <Link href="/login" className="text-muted-foreground hover:text-foreground">
                  Login
                </Link>
                <Link href="/register" className={buttonVariants({ size: "sm" })}>
                  Register
                </Link>
              </>
            ) : null /* "loading" — avoid flashing the wrong state before the session resolves */
          }
        </nav>
      </div>
    </header>
  );
}
