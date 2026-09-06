import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { notify, retryPendingNotifications } from "@/server/services/notification";

vi.mock("@/server/services/email", () => ({ sendEmail: vi.fn() }));

describe("notification dispatch (integration, hits the real dev DB)", () => {
  const suffix = Date.now();
  let userId: string;

  beforeEach(async () => {
    const user = await db.user.create({
      data: { email: `notify-${suffix}@example.com`, role: "CUSTOMER" },
    });
    userId = user.id;
  });

  afterEach(async () => {
    await db.notification.deleteMany({ where: { userId } });
    await db.user.deleteMany({ where: { id: userId } });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("marks an EMAIL notification SENT when the user has an email", async () => {
    const { sendEmail } = await import("@/server/services/email");
    const notification = await notify(userId, "EMAIL", "kyc.approved", {
      name: "Test Vendor",
      profileUrl: "/vendor/test",
    });

    const row = await db.notification.findUniqueOrThrow({ where: { id: notification.id } });
    expect(row.status).toBe("SENT");
    expect(row.sentAt).not.toBeNull();
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: `notify-${suffix}@example.com` }),
    );
  });

  it("marks an SMS notification FAILED — no approved DLT template is configured", async () => {
    const notification = await notify(userId, "SMS", "kyc.rejected", { name: "Test Vendor" });
    const row = await db.notification.findUniqueOrThrow({ where: { id: notification.id } });
    expect(row.status).toBe("FAILED");
  });

  it("marks IN_APP notifications SENT immediately — the row itself is the delivery", async () => {
    const notification = await notify(userId, "IN_APP", "kyc.approved", {
      name: "Test Vendor",
      profileUrl: "/vendor/test",
    });
    const row = await db.notification.findUniqueOrThrow({ where: { id: notification.id } });
    expect(row.status).toBe("SENT");
  });

  it("retryPendingNotifications re-attempts and resolves FAILED rows that can now succeed", async () => {
    const { sendEmail } = await import("@/server/services/email");
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("temporary outage"));

    const notification = await notify(userId, "EMAIL", "kyc.approved", {
      name: "Test Vendor",
      profileUrl: "/vendor/test",
    });
    expect(
      (await db.notification.findUniqueOrThrow({ where: { id: notification.id } })).status,
    ).toBe("FAILED");

    await retryPendingNotifications();

    const retried = await db.notification.findUniqueOrThrow({ where: { id: notification.id } });
    expect(retried.status).toBe("SENT");
  });
});
