import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { resolveBookingCustomerId } from "@/server/services/booking";

describe("resolveBookingCustomerId (integration, hits the real dev DB)", () => {
  const suffix = Date.now();
  const newPhone = `9${suffix}`.slice(0, 10);
  const existingPhone = `8${suffix}`.slice(0, 10);
  const createdUserIds: string[] = [];

  afterAll(async () => {
    await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await db.$disconnect();
  });

  it("returns the signed-in customer's own id, ignoring the phone", async () => {
    const id = await resolveBookingCustomerId(
      { id: "some-session-user-id", role: "CUSTOMER" },
      newPhone,
    );
    expect(id).toBe("some-session-user-id");
  });

  it("creates a new, unverified guest customer for an unseen phone number", async () => {
    const id = await resolveBookingCustomerId(undefined, newPhone);
    createdUserIds.push(id);

    const user = await db.user.findUniqueOrThrow({ where: { id } });
    expect(user.role).toBe("CUSTOMER");
    expect(user.phone).toBe(newPhone);
    expect(user.phoneVerifiedAt).toBeNull();
  });

  it("matches an existing user by phone instead of creating a duplicate", async () => {
    const existing = await db.user.create({
      data: { phone: existingPhone, role: "CUSTOMER" },
    });
    createdUserIds.push(existing.id);

    const id = await resolveBookingCustomerId(undefined, existingPhone);
    expect(id).toBe(existing.id);

    const count = await db.user.count({ where: { phone: existingPhone } });
    expect(count).toBe(1);
  });

  it("also matches an existing non-customer by phone rather than erroring", async () => {
    const vendor = await db.user.create({
      data: { phone: `7${suffix}`.slice(0, 10), role: "VENDOR" },
    });
    createdUserIds.push(vendor.id);

    const id = await resolveBookingCustomerId(undefined, vendor.phone!);
    expect(id).toBe(vendor.id);
  });
});
