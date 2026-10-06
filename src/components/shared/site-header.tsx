"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

import { QuickSearchForm } from "@/components/shared/quick-search-form";
import { buttonVariants } from "@/components/ui/button";
import { signOutAction } from "@/server/actions/auth";

const DASHBOARD_LINK: Record<string, { href: string; label: string }> = {
  CUSTOMER: { href: "/account", label: "My account" },
  VENDOR: { href: "/dashboard/vendor", label: "Vendor dashboard" },
  BANQUET_OWNER: { href: "/dashboard/banquet", label: "Venue dashboard" },
  ADMIN: { href: "/dashboard/admin", label: "Admin dashboard" },
  SUPPORT: { href: "/dashboard/admin", label: "Admin dashboard" },
};

type SelectOption = { slug: string; name: string };

/**
 * Client-side on purpose: reading the session via `auth()` in a Server
 * Component here would make `cookies()` part of every page's render tree —
 * since this header is mounted in the root layout, that forced the entire
 * site (including pages with no auth-dependent content at all, like /terms
 * or /login) out of static rendering. `useSession()` fetches session state
 * client-side after the static HTML ships, so pages stay static/cacheable
 * and only the header itself updates once hydrated. `cities`/`categories`
 * are safe to fetch server-side in the layout instead, since they don't
 * depend on cookies/headers/the visitor at all.
 */
export function SiteHeader({
  cities,
  categories,
}: {
  cities: SelectOption[];
  categories: SelectOption[];
}) {
  const { data: session, status } = useSession();
  const dashboard = session?.user ? DASHBOARD_LINK[session.user.role] : undefined;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-3 px-6 py-3">
        <Link
          href="/"
          className="order-1 shrink-0 font-heading text-xl font-semibold tracking-tight"
        >
          SajDhajLo
        </Link>

        <div className="order-3 w-full md:order-2 md:w-auto md:flex-1 md:px-4">
          <QuickSearchForm cities={cities} categories={categories} compact />
        </div>

        <nav className="order-2 flex items-center gap-3 text-sm md:order-3">
          <Link href="/contact" className="text-muted-foreground hover:text-foreground">
            Contact Us
          </Link>
          {
            status === "authenticated" ? (
              <>
                {dashboard && (
                  <Link
                    href={dashboard.href}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {session.user.name || dashboard.label}
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
