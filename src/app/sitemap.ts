import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";
import {
  listActiveCategories,
  listActiveCities,
  listCitiesWithListingsInCategory,
} from "@/server/repositories/catalog";
import {
  listPublishedBanquetSlugs,
  listPublishedVendorSlugs,
} from "@/server/repositories/listings";

// Statically generated at build time by default; revalidate hourly so newly
// approved vendors/banquets and newly active cities/categories show up
// without waiting for the next full deploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cities, categories, vendors, banquets] = await Promise.all([
    listActiveCities(),
    listActiveCategories(),
    listPublishedVendorSlugs(),
    listPublishedBanquetSlugs(),
  ]);

  const cityCategoryEntries = (
    await Promise.all(
      categories.map(async (category) => {
        const citiesForCategory = await listCitiesWithListingsInCategory(
          category.id,
          category.type,
        );
        return citiesForCategory.map((city) => ({
          url: absoluteUrl(`/${city.slug}/${category.slug}`),
          lastModified: category.updatedAt,
          changeFrequency: "weekly" as const,
          priority: 0.9,
        }));
      }),
    )
  ).flat();

  return [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/register"), changeFrequency: "monthly", priority: 0.3 },
    ...cities.map((city) => ({
      url: absoluteUrl(`/${city.slug}`),
      lastModified: city.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...categories.map((category) => ({
      url: absoluteUrl(`/categories/${category.slug}`),
      lastModified: category.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...cityCategoryEntries,
    ...vendors.map((vendor) => ({
      url: absoluteUrl(`/vendor/${vendor.slug}`),
      lastModified: vendor.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...banquets.map((banquet) => ({
      url: absoluteUrl(`/banquet/${banquet.slug}`),
      lastModified: banquet.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
