import { db } from "@/lib/db";
import { boundingBox } from "@/lib/geo";

export type ListingSort = "relevance" | "distance" | "price" | "rating";

export type ListingSearchParams = {
  cityId?: string;
  categoryId?: string;
  servesAtHome?: boolean;
  ratingMin?: number;
  near?: { lat: number; lng: number; radiusKm: number };
  cursor?: string;
  take?: number;
};

const MAX_PAGE_SIZE = 50;

function paginationArgs(params: ListingSearchParams) {
  const take = Math.min(params.take ?? 20, MAX_PAGE_SIZE);
  return {
    take: take + 1, // fetch one extra to know if there's a next page
    ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
  };
}

function splitPage<T extends { id: string }>(rows: T[], take: number) {
  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;
  return { items, nextCursor: hasMore ? items[items.length - 1]?.id : undefined };
}

export async function searchVendors(params: ListingSearchParams) {
  const take = Math.min(params.take ?? 20, MAX_PAGE_SIZE);
  const box = params.near
    ? boundingBox(params.near.lat, params.near.lng, params.near.radiusKm)
    : null;

  const rows = await db.vendorProfile.findMany({
    where: {
      isPublished: true,
      deletedAt: null,
      ...(params.cityId ? { cityId: params.cityId } : {}),
      ...(params.categoryId ? { primaryCategoryId: params.categoryId } : {}),
      ...(params.servesAtHome ? { servesAtHome: true } : {}),
      ...(params.ratingMin ? { ratingAvg: { gte: params.ratingMin } } : {}),
      ...(box
        ? {
            lat: { gte: box.minLat, lte: box.maxLat },
            lng: { gte: box.minLng, lte: box.maxLng },
          }
        : {}),
    },
    // Newest first among equally-unboosted listings — an ascending id
    // tiebreaker here would always rank a just-published vendor/banquet
    // last (cuids are roughly chronological), pushing it off the first
    // page in any city with more than a page's worth of listings.
    orderBy: [{ boostScore: "desc" }, { id: "desc" }],
    ...paginationArgs(params),
    select: {
      id: true,
      slug: true,
      businessName: true,
      about: true,
      coverImage: true,
      ratingAvg: true,
      ratingCount: true,
      boostScore: true,
      publishedAt: true,
      yearsExperience: true,
      teamSize: true,
      lat: true,
      lng: true,
      servesAtHome: true,
      city: { select: { name: true, slug: true } },
      primaryCategory: { select: { name: true, slug: true } },
      services: {
        where: { isActive: true },
        orderBy: { pricePaise: "asc" },
        take: 1,
        select: { pricePaise: true },
      },
    },
  });

  return splitPage(rows, take);
}

export async function searchBanquets(params: ListingSearchParams) {
  const take = Math.min(params.take ?? 20, MAX_PAGE_SIZE);
  const box = params.near
    ? boundingBox(params.near.lat, params.near.lng, params.near.radiusKm)
    : null;

  const rows = await db.banquetProfile.findMany({
    where: {
      isPublished: true,
      deletedAt: null,
      ...(params.cityId ? { cityId: params.cityId } : {}),
      ...(params.categoryId ? { primaryCategoryId: params.categoryId } : {}),
      ...(params.ratingMin ? { ratingAvg: { gte: params.ratingMin } } : {}),
      ...(box
        ? {
            lat: { gte: box.minLat, lte: box.maxLat },
            lng: { gte: box.minLng, lte: box.maxLng },
          }
        : {}),
    },
    // Newest first among equally-unboosted listings — an ascending id
    // tiebreaker here would always rank a just-published vendor/banquet
    // last (cuids are roughly chronological), pushing it off the first
    // page in any city with more than a page's worth of listings.
    orderBy: [{ boostScore: "desc" }, { id: "desc" }],
    ...paginationArgs(params),
    select: {
      id: true,
      slug: true,
      venueName: true,
      about: true,
      ratingAvg: true,
      ratingCount: true,
      boostScore: true,
      publishedAt: true,
      totalHalls: true,
      vegPricePerPlatePaise: true,
      nonVegPricePerPlatePaise: true,
      lat: true,
      lng: true,
      city: { select: { name: true, slug: true } },
    },
  });

  // MediaAsset is a polymorphic table (ownerType/ownerId), not a direct
  // Prisma relation on BanquetProfile, so its cover photo needs a separate
  // lookup rather than an `include`.
  const covers = rows.length
    ? await db.mediaAsset.findMany({
        where: { ownerType: "BANQUET", ownerId: { in: rows.map((r) => r.id) }, isCover: true },
        select: { ownerId: true, url: true },
      })
    : [];
  const coverByOwnerId = new Map(covers.map((c) => [c.ownerId, c.url]));
  const rowsWithCover = rows.map((r) => ({ ...r, coverImage: coverByOwnerId.get(r.id) ?? null }));

  return splitPage(rowsWithCover, take);
}

/** Deliberately ignores isPublished — used to find who to run the
 * subscription-expiry sync for before the real (published-only) query. */
export function findVendorOwnerBySlug(slug: string) {
  return db.vendorProfile.findUnique({ where: { slug }, select: { userId: true } });
}

export function findBanquetOwnerBySlug(slug: string) {
  return db.banquetProfile.findUnique({ where: { slug }, select: { userId: true } });
}

export function getVendorBySlug(slug: string) {
  return db.vendorProfile.findFirst({
    where: { slug, isPublished: true, deletedAt: null },
    include: {
      city: true,
      locality: true,
      primaryCategory: true,
      services: { where: { isActive: true }, include: { serviceCatalog: true } },
      packages: { where: { isActive: true } },
    },
  });
}

export function getBanquetBySlug(slug: string) {
  return db.banquetProfile.findFirst({
    where: { slug, isPublished: true, deletedAt: null },
    include: {
      city: true,
      locality: true,
      primaryCategory: true,
      halls: true,
      packages: { where: { isActive: true } },
    },
  });
}

export function getMediaFor(ownerType: "VENDOR" | "BANQUET", ownerId: string) {
  return db.mediaAsset.findMany({
    where: { ownerType, ownerId },
    orderBy: { sortOrder: "asc" },
  });
}

export function getApprovedReviewsFor(ownerType: "VENDOR" | "BANQUET", ownerId: string) {
  return db.review.findMany({
    where: { ownerType, ownerId, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { author: { select: { name: true } } },
  });
}

export function incrementVendorViewCount(vendorId: string) {
  return db.vendorProfile.update({
    where: { id: vendorId },
    data: { viewCount: { increment: 1 } },
  });
}

/** Published vendor slugs + last-modified, for the sitemap. */
export function listPublishedVendorSlugs() {
  return db.vendorProfile.findMany({
    where: { isPublished: true, deletedAt: null },
    select: { slug: true, updatedAt: true },
  });
}

/** Published banquet slugs + last-modified, for the sitemap. */
export function listPublishedBanquetSlugs() {
  return db.banquetProfile.findMany({
    where: { isPublished: true, deletedAt: null },
    select: { slug: true, updatedAt: true },
  });
}

export function similarVendorsNearby(vendorId: string, cityId: string, categoryId: string | null) {
  return db.vendorProfile.findMany({
    where: {
      id: { not: vendorId },
      isPublished: true,
      cityId,
      ...(categoryId ? { primaryCategoryId: categoryId } : {}),
    },
    orderBy: [{ boostScore: "desc" }],
    take: 6,
    select: { slug: true, businessName: true, coverImage: true, ratingAvg: true },
  });
}
