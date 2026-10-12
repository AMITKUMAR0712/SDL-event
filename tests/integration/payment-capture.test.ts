import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { capturePayment } from "@/server/services/payment";

describe("capturePayment (integration, hits the real dev DB)", () => {
  const suffix = Date.now();
  let stateId: string;
  let cityId: string;
  let vendorUserId: string;
  let vendorId: string;
  let customerId: string;
  let bookingId: string;
  let paymentId: string;
  const orderId = `order_test_${suffix}`;

  afterAll(async () => {
    await db.payment.deleteMany({ where: { id: paymentId } });
    await db.booking.deleteMany({ where: { id: bookingId } });
    await db.vendorProfile.deleteMany({ where: { id: vendorId } });
    await db.user.deleteMany({ where: { id: { in: [vendorUserId, customerId] } } });
    await db.city.deleteMany({ where: { id: cityId } });
    await db.state.deleteMany({ where: { id: stateId } });
    await db.$disconnect();
  });

  it("sets up a pending booking with an uncaptured payment", async () => {
    const state = await db.state.create({
      data: { name: `Capture Test State ${suffix}`, slug: `capture-test-state-${suffix}` },
    });
    stateId = state.id;

    const city = await db.city.create({
      data: {
        name: `Capture Test City ${suffix}`,
        slug: `capture-test-city-${suffix}`,
        stateId: state.id,
        lat: 28.6,
        lng: 77.2,
      },
    });
    cityId = city.id;

    const vendorUser = await db.user.create({
      data: { email: `capture-vendor-${suffix}@example.com`, role: "VENDOR" },
    });
    vendorUserId = vendorUser.id;

    const vendor = await db.vendorProfile.create({
      data: {
        userId: vendorUser.id,
        businessName: `Capture Test Salon ${suffix}`,
        slug: `capture-test-salon-${suffix}`,
        cityId: city.id,
        isPublished: true,
      },
    });
    vendorId = vendor.id;

    const customer = await db.user.create({
      data: { email: `capture-customer-${suffix}@example.com`, role: "CUSTOMER" },
    });
    customerId = customer.id;

    const booking = await db.booking.create({
      data: {
        bookingNo: `CAP-TEST-${suffix}`,
        customerId: customer.id,
        ownerType: "VENDOR",
        ownerId: vendor.id,
        type: "IN_STUDIO",
        scheduledAt: new Date(),
        durationMin: 60,
        status: "PENDING",
        subtotalPaise: 50_000,
        totalPaise: 50_000,
      },
    });
    bookingId = booking.id;

    const payment = await db.payment.create({
      data: {
        bookingId: booking.id,
        providerOrderId: orderId,
        amountPaise: 50_000,
        idempotencyKey: `capture-test-${suffix}`,
      },
    });
    paymentId = payment.id;
  });

  it("marks the payment CAPTURED and confirms the booking", async () => {
    await capturePayment(orderId, `pay_test_${suffix}`, { test: true });

    const payment = await db.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(payment.status).toBe("CAPTURED");
    expect(payment.providerPaymentId).toBe(`pay_test_${suffix}`);

    const booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.status).toBe("CONFIRMED");
  });

  it("is idempotent — calling it again for the same order is a no-op", async () => {
    // Simulate the webhook and the client-verify path both firing for the
    // same payment: this must never double-transition the booking or crash.
    await expect(
      capturePayment(orderId, `pay_test_${suffix}`, { test: true, secondCall: true }),
    ).resolves.toBeUndefined();

    const booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.status).toBe("CONFIRMED"); // unchanged, not re-transitioned
  });
});
