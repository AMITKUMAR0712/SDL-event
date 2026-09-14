"use client";

import { CalendarCheck, Gauge, MessageCircle, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Icons must be resolved here, inside the client component, rather than
// passed in as props — a Server Component can't hand a component reference
// (the icon) across the server/client boundary as serializable prop data.
const ICONS = { gauge: Gauge, calendar: CalendarCheck, user: UserRound, message: MessageCircle };

export type DashboardLink = { href: string; label: string; icon: keyof typeof ICONS };

function isActive(pathname: string | null, href: string, exact: boolean) {
  return pathname === href || (!exact && !!pathname?.startsWith(href + "/"));
}

export function DashboardSidebar({ title, links }: { title: string; links: DashboardLink[] }) {
  const pathname = usePathname();
  const home = links[0]?.href;

  return (
    <>
      <nav className="flex gap-1 overflow-x-auto border-b border-border p-2 md:hidden">
        {links.map((link) => {
          const Icon = ICONS[link.icon];
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
                isActive(pathname, link.href, link.href === home)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <nav className="hidden w-56 shrink-0 border-r border-border p-4 md:block">
        <p className="px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </p>
        <ul className="mt-3 space-y-0.5">
          {links.map((link) => {
            const Icon = ICONS[link.icon];
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                    isActive(pathname, link.href, link.href === home)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
