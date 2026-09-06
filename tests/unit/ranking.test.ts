import { describe, expect, it } from "vitest";

import { DEFAULT_RANKING_WEIGHTS, rankScore, sortByRank } from "@/server/services/ranking";

const baseListing = {
  ratingAvg: 4,
  boostScore: 50,
  publishedAt: new Date(),
  about: "Some text",
  coverImage: "https://example.com/cover.jpg",
  yearsExperience: 5,
  teamSize: 3,
};

describe("rankScore", () => {
  it("scores a higher-rated listing above an otherwise-identical lower-rated one", () => {
    const better = { ...baseListing, ratingAvg: 5 };
    const worse = { ...baseListing, ratingAvg: 2 };
    expect(rankScore(better, DEFAULT_RANKING_WEIGHTS)).toBeGreaterThan(
      rankScore(worse, DEFAULT_RANKING_WEIGHTS),
    );
  });

  it("scores a closer listing above a farther one when distance is known", () => {
    const near = rankScore(baseListing, DEFAULT_RANKING_WEIGHTS, {
      distanceKm: 1,
      maxDistanceKm: 25,
    });
    const far = rankScore(baseListing, DEFAULT_RANKING_WEIGHTS, {
      distanceKm: 20,
      maxDistanceKm: 25,
    });
    expect(near).toBeGreaterThan(far);
  });

  it("treats missing distance as neutral rather than penalizing a city-only search", () => {
    const noDistance = rankScore(baseListing, DEFAULT_RANKING_WEIGHTS);
    const midDistance = rankScore(baseListing, DEFAULT_RANKING_WEIGHTS, {
      distanceKm: 12.5,
      maxDistanceKm: 25,
    });
    expect(noDistance).toBeCloseTo(midDistance, 5);
  });

  it("rewards a more complete profile", () => {
    const complete = baseListing;
    const incomplete = { ...baseListing, about: null, coverImage: null, yearsExperience: null };
    expect(rankScore(complete, DEFAULT_RANKING_WEIGHTS)).toBeGreaterThan(
      rankScore(incomplete, DEFAULT_RANKING_WEIGHTS),
    );
  });

  it("rewards a higher subscription boostScore", () => {
    const boosted = { ...baseListing, boostScore: 100 };
    const unboosted = { ...baseListing, boostScore: 0 };
    expect(rankScore(boosted, DEFAULT_RANKING_WEIGHTS)).toBeGreaterThan(
      rankScore(unboosted, DEFAULT_RANKING_WEIGHTS),
    );
  });
});

describe("sortByRank", () => {
  it("sorts highest score first", () => {
    const low = { ...baseListing, ratingAvg: 1, boostScore: 0 };
    const high = { ...baseListing, ratingAvg: 5, boostScore: 100 };
    const sorted = sortByRank([low, high], DEFAULT_RANKING_WEIGHTS);
    expect(sorted[0]).toBe(high);
    expect(sorted[1]).toBe(low);
  });
});
