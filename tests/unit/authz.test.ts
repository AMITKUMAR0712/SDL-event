import { describe, expect, it } from "vitest";

import { isPathAuthorized } from "@/lib/access-control";

const ROLES = ["CUSTOMER", "VENDOR", "BANQUET_OWNER", "ADMIN", "SUPPORT"] as const;
const GUARDED_ROUTES = [
  "/dashboard/admin",
  "/dashboard/vendor",
  "/dashboard/banquet",
  "/account/bookings",
];

const ALLOWED: Record<string, readonly string[]> = {
  "/dashboard/admin": ["ADMIN", "SUPPORT"],
  "/dashboard/vendor": ["VENDOR"],
  "/dashboard/banquet": ["BANQUET_OWNER"],
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

  it("leaves ungated routes public for guests and every role, including the public profile namespace that shares a prefix with a guarded dashboard", () => {
    const publicRoutes = [
      "/",
      "/bridal-makeup/noida",
      "/dashboard-something-else-entirely",
      // Public profile pages live at /vendor/[slug] and /banquet/[slug] —
      // must stay guest-accessible even though /dashboard/vendor is guarded.
      "/vendor/some-salon-slug",
      "/banquet/some-venue-slug",
    ];
    for (const route of publicRoutes) {
      expect(isPathAuthorized(route, undefined), `guest on ${route} should be allowed`).toBe(true);
      for (const role of ROLES) {
        expect(isPathAuthorized(route, role), `${role} on ${route} should be allowed`).toBe(true);
      }
    }
  });
});
