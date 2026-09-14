import { db } from "@/lib/db";
import { GateContext, isProfileUnlocked } from "@/lib/gate";
import type { SearchParamsInput } from "@/schemas/search";
import { findCategoryBySlug, findCityBySlug } from "@/server/repositories/catalog";
import { searchBanquets, searchVendors } from "@/server/repositories/listings";
import { getSetting } from "@/server/repositories/settings";
import { DEFAULT_RANKING_WEIGHTS, RankingWeights, rankScore } from "@/server/services/ranking";

export type ListingCard = {
  id: string;
  slug: string;
  name: string;
  about: string | null;
  image: string | null;
  ratingAvg: number;
  ratingCount: number;
  boostScore: number;
  publishedAt: Date | null;
  coverImage: string | null;
  yearsExperience: number | null;
  teamSize: number | null;
  cityName: string;
  fromPricePaise: number | null;
  locked: boolean;
};

export type SearchResult = {
  items: Omit<
    ListingCard,
    "boostScore" | "publishedAt" | "coverImage" | "yearsExperience" | "teamSize"
  >[];
  nextCursor?: string;
  teaserDiscount: { code: string; label: string } | null;
};

async function bestTeaserCoupon() {
  const coupon = await db.coupon.findFirst({
    where: {
      ownerType: "PLATFORM",
      appliesTo: "UNLOCK",
      isActive: true,
      startsAt: { lte: new Date() },
      endsAt: { gte: new Date() },
    },
    orderBy: { value: "desc" },
  });
  if (!coupon) return null;
  const label =
    coupon.discountType === "PERCENT" ? `${coupon.value}% off` : `₹${coupon.value / 100} off`;
  return { code: coupon.code, label };
}

export async function runSearch(
  params: SearchParamsInput,
  // Kept in the signature for API stability across call sites (search page,
  // city/category pages) even though nothing in this function reads it
  // anymore — listings are unlocked for everyone now, see lib/gate.ts.
  _gate: GateContext,
): Promise<SearchResult> {
  const [city, category, weights] = await Promise.all([
    params.city ? findCityBySlug(params.city) : null,
    params.category ? findCategoryBySlug(params.category) : null,
    getSetting<RankingWeights>("ranking_weights", DEFAULT_RANKING_WEIGHTS),
  ]);

  const listingParams = {
    cityId: city?.id,
    categoryId: category?.id,
    servesAtHome: params.homeService,
    ratingMin: params.ratingMin,
    cursor: params.cursor,
  };

  let cards: ListingCard[];
  let nextCursor: string | undefined;

  if (params.type === "banquet") {
    const { items, nextCursor: cursor } = await searchBanquets(listingParams);
    nextCursor = cursor;
    cards = items.map((v) => ({
      id: v.id,
      slug: v.slug,
      name: v.venueName,
      about: v.about,
      image: v.coverImage,
      ratingAvg: Number(v.ratingAvg),
      ratingCount: v.ratingCount,
      boostScore: v.boostScore,
      publishedAt: v.publishedAt,
      coverImage: null,
      yearsExperience: null,
      teamSize: null,
      cityName: v.city.name,
      fromPricePaise: v.vegPricePerPlatePaise,
      locked: false,
    }));
  } else {
    const { items, nextCursor: cursor } = await searchVendors(listingParams);
    nextCursor = cursor;
    cards = items.map((v) => ({
      id: v.id,
      slug: v.slug,
      name: v.businessName,
      about: v.about,
      image: v.coverImage,
      ratingAvg: Number(v.ratingAvg),
      ratingCount: v.ratingCount,
      boostScore: v.boostScore,
      publishedAt: v.publishedAt,
      coverImage: v.coverImage,
      yearsExperience: v.yearsExperience,
      teamSize: v.teamSize,
      cityName: v.city.name,
      fromPricePaise: v.services[0]?.pricePaise ?? null,
      locked: false,
    }));
  }

  cards.sort((a, b) => rankScore(b, weights) - rankScore(a, weights));

  const items = cards.map((card) => ({
    id: card.id,
    slug: card.slug,
    name: card.name,
    about: card.about,
    image: card.image,
    ratingAvg: card.ratingAvg,
    ratingCount: card.ratingCount,
    cityName: card.cityName,
    fromPricePaise: card.fromPricePaise,
    locked: !isProfileUnlocked(),
  }));

  return { items, nextCursor, teaserDiscount: await bestTeaserCoupon() };
}
