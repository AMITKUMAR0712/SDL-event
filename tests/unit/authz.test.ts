import { describe, expect, it } from "vitest";

import { isPathAuthorized } from "@/lib/access-control";

const ROLES = ["CUSTOMER", "VENDOR", "BANQUET_OWNER", "ADMIN", "SUPPORT"] as const;
const GUARDED_ROUTES = [
  "/admin/dashboard",
  "/vendor/dashboard",
  "/banquet/dashboard",
  "/account/bookings",
];

const ALLOWED: Record<string, readonly string[]> = {
  "/admin/dashboard": ["ADMIN", "SUPPORT"],
  "/vendor/dashboard": ["VENDOR"],
  "/banquet/dashboard": ["BANQUET_OWNER"],
  "/account/bookings": ["CUSTOMER", "VENDOR", "BANQUET_OWNER", "ADMIN", "SUPPORT"],
};

describe("isPathAuthorized — role matrix", () => {
  it("blocks every role from every route it must not access, and allows the rest", () => {
    for (const route of GUARDED_ROUTES) {
      for (const role of ROLES) {
        const expected = ALLOWED[route].includes(role);
        expect(
          isPathAuthorized(route, role),
          `${role} on ${route} should be ${expected ? "allowed" : "blocked"}`,
        ).toBe(expected);
      }
    }
  });

  it("blocks guests (no session) from every guarded route", () => {
    for (const route of GUARDED_ROUTES) {
      expect(isPathAuthorized(route, undefined), `guest on ${route} should be blocked`).toBe(false);
    }
  });

  it("leaves ungated routes public for guests and every role", () => {
    const publicRoutes = ["/", "/bridal-makeup/noida", "/vendor-something-else-entirely"];
    for (const route of publicRoutes) {
      expect(isPathAuthorized(route, undefined)).toBe(true);
      for (const role of ROLES) {
        expect(isPathAuthorized(route, role)).toBe(true);
      }
    }
  });
});
