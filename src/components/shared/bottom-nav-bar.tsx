"use client";

import { LayoutGrid, MapPin, Phone, UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/register", label: "Register", icon: UserPlus },
  { href: "/contact", label: "Contact Us", icon: Phone },
  { href: "/#cities", label: "All City", icon: MapPin },
  { href: "/search", label: "All Services", icon: LayoutGrid },
] as const;

/**
 * Android-app-style bottom tab bar — mobile only (public/marketing pages
 * only; dashboards have their own mobile nav via DashboardSidebar). Fixed to
 * the viewport bottom with a safe-area inset for notched phones; the parent
 * (marketing) layout adds matching bottom padding so page content never sits
 * underneath it.
 */
export function BottomNavBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {ITEMS.map((item) => {
        const active = item.href !== "/#cities" && pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 text-xs ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="size-5" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
