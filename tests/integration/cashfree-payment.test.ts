import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { isCashfreeOrderPaid, verifyCashfreeWebhookSignature } from "@/server/services/cashfree";
import { initiateBookingPayment } from "@/server/services/payment";

describe("Cashfree payment integration (hits the real Cashfree sandbox API + dev DB)", () => {
  const suffix = Date.now();
  let customerId: string;
  let bookingWithPhoneId: string;
  let bookingNoPhoneId: string;
  let createdOrderId: string | undefined;

  afterAll(async () => {
    await db.payment.deleteMany({
      where: { bookingId: { in: [bookingWithPhoneId, bookingNoPhoneId] } },
    });
    await db.booking.deleteMany({ where: { id: { in: [bookingWithPhoneId, bookingNoPhoneId] } } });
    await db.user.deleteMany({ where: { id: customerId } });
    await db.$disconnect();
  });

  it("sets up a customer and two bookings, one with a contact phone and one without", async () => {
    const customer = await db.user.create({
      data: { email: `cashfree-test-customer-${suffix}@example.com`, role: "CUSTOMER" },
    });
    customerId = customer.id;

    const bookingWithPhone = await db.booking.create({
      data: {
        bookingNo: `CF-TEST-${suffix}`,
        customerId: customer.id,
        ownerType: "VENDOR",
        ownerId: "nonexistent-vendor-id",
        type: "IN_STUDIO",
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        durationMin: 60,
        status: "PENDING",
        subtotalPaise: 50_000,
        totalPaise: 50_000,
        contactPhone: "9876543210",
      },
    });
    bookingWithPhoneId = bookingWithPhone.id;

    const bookingNoPhone = await db.booking.create({
      data: {
        bookingNo: `CF-TEST-NOPHONE-${suffix}`,
        customerId: customer.id,
        ownerType: "VENDOR",
        ownerId: "nonexistent-vendor-id",
        type: "IN_STUDIO",
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        durationMin: 60,
        status: "PENDING",
        subtotalPaise: 50_000,
        totalPaise: 50_000,
      },
    });
    bookingNoPhoneId = bookingNoPhone.id;
  });

  it("refuses to initiate payment when the booking has no contact phone", async () => {
    const result = await initiateBookingPayment(bookingNoPhoneId);
    expect(result).toEqual({ ok: false, reason: "PHONE_REQUIRED" });
  });

  it("creates a real Cashfree sandbox order and payment session", async () => {
    const result = await initiateBookingPayment(bookingWithPhoneId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.orderId).toBe(`CF-TEST-${suffix}`);
    expect(result.paymentSessionId).toMatch(/^session_/);
    expect(result.amountPaise).toBe(50_000);
    createdOrderId = result.orderId;

    const payment = await db.payment.findFirst({ where: { bookingId: bookingWithPhoneId } });
    expect(payment?.provider).toBe("CASHFREE");
    expect(payment?.providerOrderId).toBe(result.orderId);
  });

  it("reports the freshly-created order as not yet paid", async () => {
    expect(createdOrderId).toBeDefined();
    const status = await isCashfreeOrderPaid(createdOrderId!);
    expect(status).toEqual({ paid: false });
  });

  it("throws on an invalid webhook signature", () => {
    expect(() =>
      verifyCashfreeWebhookSignature('{"type":"PAYMENT_SUCCESS_WEBHOOK"}', "bad-signature", "123"),
    ).toThrow();
  });
});
