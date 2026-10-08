import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { cancelBookingAsAdmin, deleteUser } from "@/server/services/admin";
import { authenticateWithPassword, hashPassword } from "@/server/services/auth";

describe("admin moderation: delete user, cancel booking (integration, hits the real dev DB)", () => {
  const suffix = Date.now();
  const ctx = { actorId: "" };
  let actorId: string;
  let regularUserId: string;
  let adminUserId: string;
  let bookingId: string;

  afterAll(async () => {
    await db.booking.deleteMany({ where: { id: bookingId } });
    await db.auditLog.deleteMany({ where: { actorId } });
    await db.user.deleteMany({ where: { id: { in: [actorId, regularUserId, adminUserId] } } });
    await db.$disconnect();
  });

  it("sets up an acting admin, a regular user, another admin, and a booking", async () => {
    const actor = await db.user.create({
      data: { email: `moderation-admin-${suffix}@example.com`, role: "ADMIN" },
    });
    actorId = actor.id;
    ctx.actorId = actor.id;

    const regular = await db.user.create({
      data: {
        email: `moderation-user-${suffix}@example.com`,
        role: "CUSTOMER",
        passwordHash: await hashPassword("Password123"),
      },
    });
    regularUserId = regular.id;

    const otherAdmin = await db.user.create({
      data: { email: `moderation-other-admin-${suffix}@example.com`, role: "ADMIN" },
    });
    adminUserId = otherAdmin.id;

    const booking = await db.booking.create({
      data: {
        bookingNo: `MOD-TEST-${suffix}`,
        customerId: regular.id,
        ownerType: "VENDOR",
        ownerId: "nonexistent-vendor-id",
        type: "IN_STUDIO",
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        durationMin: 60,
        status: "PENDING",
        subtotalPaise: 100_00,
        totalPaise: 100_00,
      },
    });
    bookingId = booking.id;
  });

  it("soft-deletes a regular user and blocks them from logging in afterwards", async () => {
    const loginBefore = await authenticateWithPassword(
      `moderation-user-${suffix}@example.com`,
      "Password123",
    );
    expect(loginBefore.ok).toBe(true);

    const result = await deleteUser(regularUserId, ctx);
    expect(result).toEqual({ ok: true });

    const after = await db.user.findUniqueOrThrow({ where: { id: regularUserId } });
    expect(after.deletedAt).not.toBeNull();
    expect(after.status).toBe("BANNED");

    const loginAfter = await authenticateWithPassword(
      `moderation-user-${suffix}@example.com`,
      "Password123",
    );
    expect(loginAfter).toEqual({ ok: false, reason: "DISABLED" });
  });

  it("refuses to delete another admin or the acting admin's own account", async () => {
    expect(await deleteUser(adminUserId, ctx)).toEqual({ ok: false, reason: "ADMIN_PROTECTED" });
    expect(await deleteUser(actorId, ctx)).toEqual({ ok: false, reason: "SELF" });
  });

  it("cancels a booking as admin and writes an audit log entry", async () => {
    const result = await cancelBookingAsAdmin(bookingId, ctx);
    expect(result).toEqual({ ok: true });

    const booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.status).toBe("CANCELLED");

    const auditEntry = await db.auditLog.findFirst({
      where: { actorId, entityType: "Booking", entityId: bookingId, action: "booking.cancel" },
    });
    expect(auditEntry).not.toBeNull();
  });

  it("reports NOT_FOUND for a booking that doesn't exist", async () => {
    const result = await cancelBookingAsAdmin("nonexistent-booking-id", ctx);
    expect(result).toEqual({ ok: false, reason: "NOT_FOUND" });
  });
});
