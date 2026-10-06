import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ListingGrid } from "@/components/shared/listing-grid";
import { getGateContext } from "@/lib/gate";
import { breadcrumbJsonLd, itemListJsonLd, pageDescription, pageTitle } from "@/lib/seo";
import {
  findCategoryBySlug,
  findCityBySlug,
  listActiveCategories,
  listCitiesWithListingsInCategory,
} from "@/server/repositories/catalog";
import { runSearch } from "@/server/services/search";

export async function generateStaticParams() {
  const categories = await listActiveCategories();
  const pairs = await Promise.all(
    categories.map(async (category) => {
      const cities = await listCitiesWithListingsInCategory(category.id, category.type);
      return cities.map((city) => ({ citySlug: city.slug, categorySlug: category.slug }));
    }),
  );
  return pairs.flat();
}

export async function generateMetadata(
  props: PageProps<"/[citySlug]/[categorySlug]">,
): Promise<Metadata> {
  const { citySlug, categorySlug } = await props.params;
  const [city, category] = await Promise.all([
    findCityBySlug(citySlug),
    findCategoryBySlug(categorySlug),
  ]);
  if (!city || !category) return {};

  const title = pageTitle(`${category.name} in ${city.name} — Compare & Book`);
  const description = pageDescription(
    `Compare verified ${category.name.toLowerCase()} in ${city.name} on SajDhajLo. ` +
      `Real ratings, transparent pricing, and instant booking.`,
  );

  return {
    title,
    description,
    alternates: { canonical: `/${city.slug}/${category.slug}` },
    openGraph: { title, description, type: "website" },
  };
}

export default async function CityCategoryLandingPage(
  props: PageProps<"/[citySlug]/[categorySlug]">,
) {
  const { citySlug, categorySlug } = await props.params;
  const [city, category] = await Promise.all([
    findCityBySlug(citySlug),
    findCategoryBySlug(categorySlug),
  ]);
  if (!city || !city.isActive || !category || !category.isActive) notFound();

  const type = category.type === "BANQUET" ? "banquet" : "vendor";
  const gate = await getGateContext();
  const result = await runSearch({ type, city: city.slug, category: category.slug }, gate);

  const visibleItems = result.items.filter((item) => !item.locked);
  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: city.name, path: `/${city.slug}` },
      { name: category.name, path: `/${city.slug}/${category.slug}` },
    ]),
    itemListJsonLd(
      visibleItems.map((item) => ({ name: item.name, path: `/${type}/${item.slug}` })),
    ),
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/">Home</Link> <span aria-hidden="true">/</span>{" "}
        <Link href={`/${city.slug}`}>{city.name}</Link> <span aria-hidden="true">/</span>{" "}
        {category.name}
      </nav>

      <h1 className="mt-2 font-heading text-3xl">
        {category.name} in {city.name}
      </h1>
      <p className="mt-2 text-muted-foreground">{result.items.length} results</p>

      {category.longDescription && (
        <p className="mt-4 max-w-3xl text-muted-foreground">{category.longDescription}</p>
      )}

      <ListingGrid
        items={result.items}
        type={type}
        teaserDiscount={result.teaserDiscount}
        nextHref={
          result.nextCursor
            ? `/search?type=${type}&city=${city.slug}&category=${category.slug}&cursor=${result.nextCursor}`
            : undefined
        }
      />

      <p className="mt-10 text-sm text-muted-foreground">
        Looking for something else?{" "}
        <Link href={`/${city.slug}`} className="underline">
          See all services in {city.name}
        </Link>{" "}
        or{" "}
        <Link href={`/categories/${category.slug}`} className="underline">
          {category.name} in other cities
        </Link>
        .
      </p>
    </main>
  );
}
