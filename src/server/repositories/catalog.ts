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
