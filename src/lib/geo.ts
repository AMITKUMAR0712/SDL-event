/**
 * Geo search strategy: bounding-box prefilter + Haversine, not MySQL spatial types.
 *
 * MySQL 8 has GEOMETRY columns, spatial indexes, and ST_Distance_Sphere — but
 * Prisma has no schema-level support for spatial column types (no way to
 * declare a GEOMETRY field in schema.prisma, no spatial index attribute). Using
 * them would mean every query that touches location — including plain CRUD on
 * a vendor's address — drops out of the Prisma Client into raw SQL, losing
 * type safety and migration tracking for that whole slice of the app.
 *
 * Instead: lat/lng are stored as plain Decimal(10,7) columns (see
 * prisma/schema.prisma) with a normal composite index. A search first narrows
 * candidates with a cheap indexed range query (boundingBox — four comparisons,
 * no trig, uses the btree index), then computes exact Haversine distance only
 * over that already-small candidate set, in SQL for sorting/pagination or in
 * JS when the candidate set is small enough to have already been fetched.
 * This gets nearly all of the performance benefit of a spatial index while
 * every other query on these tables stays fully type-safe Prisma Client code.
 */

const EARTH_RADIUS_KM = 6371;
const KM_PER_DEGREE_LAT = 111.32;

export type BoundingBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

/**
 * A degree-of-latitude is ~111.32km everywhere; a degree-of-longitude shrinks
 * toward the poles by cos(latitude). Widening the box slightly is fine — it's
 * a prefilter, not the final answer — narrowing it would wrongly exclude
 * results near the box's diagonal edges.
 */
export function boundingBox(lat: number, lng: number, radiusKm: number): BoundingBox {
  const latDelta = radiusKm / KM_PER_DEGREE_LAT;
  const kmPerDegreeLng = KM_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180);
  const lngDelta = radiusKm / Math.max(kmPerDegreeLng, 0.0001);

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

/** Great-circle distance between two points, in kilometres. */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Raw-SQL Haversine expression, for use inside a `$queryRaw` after the
 * bounding-box prefilter has already cut the candidate set down — e.g.
 *
 *   SELECT id, ${haversineDistanceSql("lat", "lng", origin.lat, origin.lng)} AS distanceKm
 *   FROM VendorProfile
 *   WHERE lat BETWEEN ${box.minLat} AND ${box.maxLat}
 *     AND lng BETWEEN ${box.minLng} AND ${box.maxLng}
 *   ORDER BY distanceKm ASC
 *
 * `latColumn`/`lngColumn` must be trusted identifiers (constants you write in
 * code, never user input) — they're interpolated as raw SQL, not parameters.
 */
export function haversineDistanceSql(
  latColumn: string,
  lngColumn: string,
  originLat: number,
  originLng: number,
): string {
  return `(
    ${EARTH_RADIUS_KM} * 2 * ASIN(SQRT(
      POWER(SIN(RADIANS(${latColumn} - ${originLat}) / 2), 2) +
      COS(RADIANS(${originLat})) * COS(RADIANS(${latColumn})) *
      POWER(SIN(RADIANS(${lngColumn} - ${originLng}) / 2), 2)
    ))
  )`;
}
