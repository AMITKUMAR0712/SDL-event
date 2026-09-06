import { describe, expect, it } from "vitest";

import {
  absoluteUrl,
  breadcrumbJsonLd,
  itemListJsonLd,
  pageDescription,
  pageTitle,
  truncate,
} from "@/lib/seo";

describe("seo", () => {
  it("leaves short text untouched", () => {
    expect(truncate("Bridal Makeup in Mumbai", 60)).toBe("Bridal Makeup in Mumbai");
  });

  it("truncates on a word boundary rather than mid-word", () => {
    const long = "Compare verified bridal makeup artists in Mumbai with real ratings and pricing";
    const result = truncate(long, 40);
    const withoutEllipsis = result.slice(0, -1);
    expect(result.length).toBeLessThanOrEqual(41); // 40 + the ellipsis char
    expect(result.endsWith("…")).toBe(true);
    // The text before the ellipsis must be a run of whole words from the
    // original string — i.e. immediately followed by a space or the end of
    // the string there, never mid-word.
    expect(long.startsWith(withoutEllipsis)).toBe(true);
    const nextChar = long[withoutEllipsis.length];
    expect(nextChar === undefined || nextChar === " ").toBe(true);
  });

  it("caps page titles at 60 chars and descriptions at 158", () => {
    const long = "a".repeat(200);
    expect(pageTitle(long).replace("…", "").length).toBeLessThanOrEqual(60);
    expect(pageDescription(long).replace("…", "").length).toBeLessThanOrEqual(158);
  });

  it("builds absolute URLs from the configured app URL", () => {
    expect(absoluteUrl("/mumbai/bridal-makeup")).toMatch(/^https?:\/\/.+\/mumbai\/bridal-makeup$/);
  });

  it("builds a BreadcrumbList with 1-based positions and absolute item URLs", () => {
    const jsonLd = breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Mumbai", path: "/mumbai" },
    ]);
    expect(jsonLd["@type"]).toBe("BreadcrumbList");
    expect(jsonLd.itemListElement).toHaveLength(2);
    expect(jsonLd.itemListElement[0].position).toBe(1);
    expect(jsonLd.itemListElement[1].position).toBe(2);
    expect(jsonLd.itemListElement[1].item).toMatch(/\/mumbai$/);
  });

  it("builds an ItemList with 1-based positions", () => {
    const jsonLd = itemListJsonLd([
      { name: "Glow Studio", path: "/vendor/glow-studio" },
      { name: "Radiance Salon", path: "/vendor/radiance-salon" },
    ]);
    expect(jsonLd["@type"]).toBe("ItemList");
    expect(jsonLd.itemListElement.map((e) => e.position)).toEqual([1, 2]);
  });
});
