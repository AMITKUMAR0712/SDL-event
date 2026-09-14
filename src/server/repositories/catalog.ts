import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";

/**
 * Cities/categories for the navbar's search box, mounted in the root layout —
 * meaning it runs on every single page request across the whole site,
 * including dynamic dashboard pages. Cached for an hour (cities/categories
 * change rarely) so that isn't two extra queries per page view forever, but
 * tagged so an admin adding a city/category (server/services/admin.ts) can
 * force it fresh immediately via updateTag instead of waiting out the
 * window — found this staleness via testing the admin city-image feature.
 */
export const HEADER_SEARCH_OPTIONS_TAG = "header-search-options";

export const getHeaderSearchOptions = unstable_cache(
  async () => {
    const [cities, categories] = await Promise.all([
      db.city.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { slug: true, name: true },
      }),
      db.category.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { slug: true, name: true },
      }),
    ]);
    return { cities, categories };
  },
  [HEADER_SEARCH_OPTIONS_TAG],
  { revalidate: 3600, tags: [HEADER_SEARCH_OPTIONS_TAG] },
);

/** Real counts for the home page's trust-stats row — never hardcoded marketing numbers. */
export async function getMarketplaceStats() {
  const [cities, vendors, banquets] = await Promise.all([
    db.city.count({ where: { isActive: true } }),
    db.vendorProfile.count({ where: { isPublished: true } }),
    db.banquetProfile.count({ where: { isPublished: true } }),
  ]);
  return { cities, vendors, banquets };
}

export function listCitiesForSelect() {
  return db.city.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export function listLocalitiesForCity(cityId: string) {
  return db.locality.findMany({
    where: { cityId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export function listBeautyServiceCatalog() {
  return db.serviceCatalog.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, categoryId: true, defaultDurationMin: true },
  });
}

export function listPlansForAudience(audience: "VENDOR" | "BANQUET") {
  return db.subscriptionPlan.findMany({
    where: { audience, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, code: true, name: true, pricePaise: true, trialDays: true },
  });
}

/** Full plan + features, for pricing display (e.g. the home page's vendor pricing section). */
export function listActivePlansWithFeatures(audience: "VENDOR" | "BANQUET" | "CUSTOMER") {
  return db.subscriptionPlan.findMany({
    where: { audience, isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { features: true },
  });
}

export function findPlanByCode(code: string) {
  return db.subscriptionPlan.findUnique({ where: { code } });
}

export function findServiceCatalogByIds(ids: string[]) {
  return db.serviceCatalog.findMany({ where: { id: { in: ids } } });
}

export function findCityBySlug(slug: string) {
  return db.city.findUnique({ where: { slug } });
}

export function findCategoryBySlug(slug: string) {
  return db.category.findUnique({ where: { slug } });
}

export function listCategories(type?: "BEAUTY" | "BANQUET") {
  return db.category.findMany({
    where: { isActive: true, ...(type ? { type } : {}) },
    orderBy: { sortOrder: "asc" },
  });
}

/** Every active city, for SEO landing-page static params and the sitemap. */
export function listActiveCities() {
  return db.city.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      slug: true,
      name: true,
      imageUrl: true,
      seoTitle: true,
      seoDescription: true,
      updatedAt: true,
    },
  });
}

/** Every active category, for SEO landing-page static params and the sitemap. */
export function listActiveCategories() {
  return db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      imageUrl: true,
      seoTitle: true,
      seoDescription: true,
      updatedAt: true,
    },
  });
}

export function listStates() {
  return db.state.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
}

/** Cities that have at least one published listing in the given category — avoids generating a thin/empty SEO page. */
export function listCitiesWithListingsInCategory(categoryId: string, type: "BEAUTY" | "BANQUET") {
  if (type === "BEAUTY") {
    return db.city.findMany({
      where: {
        isActive: true,
        vendors: { some: { isPublished: true, primaryCategoryId: categoryId } },
      },
      orderBy: { name: "asc" },
      select: { slug: true, name: true },
    });
  }
  return db.city.findMany({
    where: {
      isActive: true,
      banquets: { some: { isPublished: true, primaryCategoryId: categoryId } },
    },
    orderBy: { name: "asc" },
    select: { slug: true, name: true },
  });
}

/** Categories that have at least one published listing in the given city — avoids generating a thin/empty SEO page. */
export async function listCategoriesWithListingsInCity(cityId: string) {
  const [vendorCategoryIds, banquetCategoryIds] = await Promise.all([
    db.vendorProfile.findMany({
      where: { isPublished: true, cityId, primaryCategoryId: { not: null } },
      select: { primaryCategoryId: true },
      distinct: ["primaryCategoryId"],
    }),
    db.banquetProfile.findMany({
      where: { isPublished: true, cityId, primaryCategoryId: { not: null } },
      select: { primaryCategoryId: true },
      distinct: ["primaryCategoryId"],
    }),
  ]);

  const categoryIds = [
    ...new Set(
      [...vendorCategoryIds, ...banquetCategoryIds]
        .map((row) => row.primaryCategoryId)
        .filter((id): id is string => id !== null),
    ),
  ];
  if (categoryIds.length === 0) return [];

  return db.category.findMany({
    where: { id: { in: categoryIds }, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true, type: true },
  });
}
