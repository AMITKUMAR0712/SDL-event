/**
 * Listing ranking formula (admin-tunable via the `ranking_weights` Setting,
 * seeded in prisma/seed.ts): a weighted sum of six [0,1]-normalized signals.
 *
 *   score = w.distance            * distanceScore
 *         + w.rating              * ratingScore
 *         + w.profileCompleteness * completenessScore
 *         + w.responseRate        * responseRateScore
 *         + w.boostScore          * boostScore / 100
 *         + w.recency             * recencyScore
 *
 * - distanceScore: 1 at 0km, linearly down to 0 at `maxDistanceKm` (the
 *   search radius). No distance context (a city-only search, not "near me")
 *   scores a neutral 0.5 for every candidate so the other signals decide.
 * - ratingScore: ratingAvg / 5. A listing with zero reviews scores 0 here —
 *   deliberately not defaulted higher, so real reviews are what wins ties.
 * - completenessScore: fraction of a small set of profile fields that are
 *   filled in (about, coverImage, years of experience, team size). This is
 *   a coarse proxy for profile quality; Phase 6 may replace it with
 *   something richer once admin has visibility into what actually
 *   correlates with conversion.
 * - responseRateScore: **not tracked yet** — Lead response times aren't
 *   recorded anywhere in the schema. Fixed at 0.5 (neutral) until that
 *   exists; the weight is still admin-configurable so it can be zeroed out
 *   or left ready for when the data lands.
 * - boostScore / 100: the vendor/banquet's own boostScore field, driven by
 *   subscription tier.
 * - recencyScore: 1 for a listing published today, decaying toward 0 over a
 *   year — keeps freshly onboarded (and freshly re-verified) listings from
 *   being buried under long-established ones with more accumulated rating
 *   volume alone.
 */

export type RankingWeights = {
  distance: number;
  rating: number;
  profileCompleteness: number;
  responseRate: number;
  boostScore: number;
  recency: number;
};

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  distance: 0.35,
  rating: 0.25,
  profileCompleteness: 0.1,
  responseRate: 0.1,
  boostScore: 0.15,
  recency: 0.05,
};

export type RankableListing = {
  ratingAvg: number;
  boostScore: number;
  publishedAt: Date | null;
  about: string | null;
  coverImage: string | null;
  yearsExperience: number | null;
  teamSize: number | null;
};

const RECENCY_HALF_LIFE_DAYS = 365;

function completenessScore(listing: RankableListing): number {
  const fields = [listing.about, listing.coverImage, listing.yearsExperience, listing.teamSize];
  const filled = fields.filter((f) => f !== null && f !== undefined && f !== "").length;
  return filled / fields.length;
}

function recencyScore(publishedAt: Date | null): number {
  if (!publishedAt) return 0;
  const daysSincePublish = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);
  return 1 / (1 + daysSincePublish / RECENCY_HALF_LIFE_DAYS);
}

function distanceScore(distanceKm: number | undefined, maxDistanceKm: number): number {
  if (distanceKm === undefined) return 0.5;
  return Math.max(0, 1 - distanceKm / maxDistanceKm);
}

export function rankScore(
  listing: RankableListing,
  weights: RankingWeights,
  options: { distanceKm?: number; maxDistanceKm?: number } = {},
): number {
  const maxDistanceKm = options.maxDistanceKm ?? 25;

  return (
    weights.distance * distanceScore(options.distanceKm, maxDistanceKm) +
    weights.rating * (listing.ratingAvg / 5) +
    weights.profileCompleteness * completenessScore(listing) +
    weights.responseRate * 0.5 +
    weights.boostScore * (listing.boostScore / 100) +
    weights.recency * recencyScore(listing.publishedAt)
  );
}

export function sortByRank<T extends RankableListing>(
  listings: T[],
  weights: RankingWeights,
  distanceByListing?: Map<T, number>,
  maxDistanceKm?: number,
): T[] {
  return [...listings].sort(
    (a, b) =>
      rankScore(b, weights, { distanceKm: distanceByListing?.get(b), maxDistanceKm }) -
      rankScore(a, weights, { distanceKm: distanceByListing?.get(a), maxDistanceKm }),
  );
}
