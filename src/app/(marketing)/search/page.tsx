import type { Metadata } from "next";

import { ListingGrid } from "@/components/shared/listing-grid";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { getGateContext } from "@/lib/gate";
import { searchParamsSchema } from "@/schemas/search";
import { listActiveCategories, listActiveCities } from "@/server/repositories/catalog";
import { runSearch } from "@/server/services/search";

// A raw filter view over the same data as the /[city]/[category] landing
// pages — kept out of the index so those richer, static-content pages are
// the canonical target for search engines instead of every query-string combo.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function SearchPage(props: PageProps<"/search">) {
  const rawParams = await props.searchParams;
  const parsed = searchParamsSchema.safeParse({
    type: rawParams.type,
    city: rawParams.city,
    category: rawParams.category,
    homeService: rawParams.homeService,
    ratingMin: rawParams.ratingMin,
    cursor: rawParams.cursor,
  });
  const params = parsed.success ? parsed.data : { type: "vendor" as const };

  const [gate, cities, categories] = await Promise.all([
    getGateContext(),
    listActiveCities(),
    listActiveCategories(),
  ]);
  const result = await runSearch(params, gate);
  const basePath = `/search?type=${params.type}${params.city ? `&city=${params.city}` : ""}${
    params.category ? `&category=${params.category}` : ""
  }`;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-heading text-3xl">
        {params.type === "banquet" ? "Banquet halls" : "Beauty vendors"} near you
      </h1>
      <p className="mt-2 text-muted-foreground">{result.items.length} results</p>

      <div className="mt-6">
        <SearchFilterBar
          cities={cities.map((c) => ({ slug: c.slug, name: c.name }))}
          categories={categories.map((c) => ({ slug: c.slug, name: c.name, type: c.type }))}
          initial={{
            type: params.type,
            city: params.city,
            category: params.category,
            homeService: params.homeService,
          }}
        />
      </div>

      {result.items.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">
          No results yet for these filters — try a different city or category.
        </p>
      ) : (
        <ListingGrid
          items={result.items}
          type={params.type}
          teaserDiscount={result.teaserDiscount}
          nextHref={result.nextCursor ? `${basePath}&cursor=${result.nextCursor}` : undefined}
        />
      )}
    </main>
  );
}
