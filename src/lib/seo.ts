import { env } from "@/lib/env";

const SITE_NAME = "MakeGlowOver";

export function absoluteUrl(path: string): string {
  return new URL(path, env.NEXT_PUBLIC_APP_URL).toString();
}

/** Truncates on a word boundary so meta tags never end mid-word. */
export function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max)}…`;
}

export function pageTitle(title: string): string {
  return truncate(title, 60);
}

export function pageDescription(description: string): string {
  return truncate(description, 158);
}

export type BreadcrumbItem = { name: string; path: string };

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export type ItemListEntry = { name: string; path: string };

/**
 * `ItemList` for a listing/search page. Per CLAUDE.md's SEO-honesty rule this
 * only ever lists items actually rendered on the page — a locked/blurred
 * teaser card is not a "real" listed item, so callers must filter those out
 * before passing entries here.
 */
export function itemListJsonLd(entries: ItemListEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: entries.map((entry, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: entry.name,
      url: absoluteUrl(entry.path),
    })),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: absoluteUrl("/"),
  };
}

/** Marks the gated part of a profile/listing page as paid content, not cloaked from crawlers. */
export function gatedContentJsonLd(cssSelector: string) {
  return {
    "@type": "WebPageElement",
    isAccessibleForFree: false,
    cssSelector,
  };
}
