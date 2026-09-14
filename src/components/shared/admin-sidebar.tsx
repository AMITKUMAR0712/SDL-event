"use client";

import {
  AudioWaveform,
  Gauge,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  Tags,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard/admin", label: "Dashboard", icon: Gauge },
  { href: "/dashboard/admin/kyc", label: "KYC review", icon: ShieldCheck },
  { href: "/dashboard/admin/bookings", label: "Bookings", icon: AudioWaveform },
  { href: "/dashboard/admin/plans", label: "Plans", icon: Wallet },
  { href: "/dashboard/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/dashboard/admin/cities", label: "Cities", icon: MapPin },
  { href: "/dashboard/admin/categories", label: "Categories", icon: Tags },
  { href: "/dashboard/admin/users", label: "Users", icon: Users },
  { href: "/dashboard/admin/messages", label: "Messages", icon: Mail },
  { href: "/dashboard/admin/settings", label: "Settings", icon: Sparkles },
  { href: "/dashboard/admin/audit-log", label: "Audit log", icon: AudioWaveform },
];

function isActive(pathname: string | null, href: string) {
  return pathname === href || (href !== "/dashboard/admin" && !!pathname?.startsWith(href));
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile: horizontal scroll of the same links, sidebar hidden */}
      <nav className="flex gap-1 overflow-x-auto border-b border-border p-2 md:hidden">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
              isActive(pathname, link.href)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <link.icon className="size-3.5" aria-hidden="true" />
            {link.label}
          </Link>
        ))}
      </nav>

      <nav className="hidden w-56 shrink-0 border-r border-border p-4 md:block">
        <p className="px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Admin
        </p>
        <ul className="mt-3 space-y-0.5">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                  isActive(pathname, link.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <link.icon className="size-4" aria-hidden="true" />
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
