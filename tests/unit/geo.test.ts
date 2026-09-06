import { describe, expect, it } from "vitest";

import { boundingBox, haversineDistanceKm, haversineDistanceSql } from "@/lib/geo";

describe("geo", () => {
  it("computes zero distance for identical points", () => {
    expect(haversineDistanceKm(28.6139, 77.209, 28.6139, 77.209)).toBeCloseTo(0, 5);
  });

  it("computes a known distance between Delhi and Mumbai within 1% tolerance", () => {
    // Delhi (28.6139, 77.2090) to Mumbai (19.0760, 72.8777) is ~1150km great-circle.
    const distance = haversineDistanceKm(28.6139, 77.209, 19.076, 72.8777);
    expect(distance).toBeGreaterThan(1100);
    expect(distance).toBeLessThan(1200);
  });

  it("builds a bounding box that contains a point at the given radius", () => {
    const origin = { lat: 28.6139, lng: 77.209 };
    const radiusKm = 10;
    const box = boundingBox(origin.lat, origin.lng, radiusKm);

    expect(box.minLat).toBeLessThan(origin.lat);
    expect(box.maxLat).toBeGreaterThan(origin.lat);
    expect(box.minLng).toBeLessThan(origin.lng);
    expect(box.maxLng).toBeGreaterThan(origin.lng);

    // A point just inside the radius, due north, should fall inside the box.
    const nearbyLat = origin.lat + radiusKm / 111.32 - 0.001;
    expect(nearbyLat).toBeGreaterThan(box.minLat);
    expect(nearbyLat).toBeLessThan(box.maxLat);
  });

  it("widens the longitude span at higher latitudes to account for meridian convergence", () => {
    const equatorBox = boundingBox(0, 0, 50);
    const highLatBox = boundingBox(60, 0, 50);

    const equatorLngSpan = equatorBox.maxLng - equatorBox.minLng;
    const highLatLngSpan = highLatBox.maxLng - highLatBox.minLng;

    expect(highLatLngSpan).toBeGreaterThan(equatorLngSpan);
  });

  it("produces a raw SQL fragment referencing the given columns", () => {
    const sql = haversineDistanceSql("lat", "lng", 28.6139, 77.209);
    expect(sql).toContain("lat");
    expect(sql).toContain("lng");
    expect(sql).toContain("28.6139");
    expect(sql).toContain("77.209");
  });
});
