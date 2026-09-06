import { db } from "@/lib/db";

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
    select: { slug: true, name: true, seoTitle: true, seoDescription: true, updatedAt: true },
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
      seoTitle: true,
      seoDescription: true,
      updatedAt: true,
    },
  });
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
