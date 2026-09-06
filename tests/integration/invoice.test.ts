import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { ensureInvoiceForBooking, renderInvoicePdf } from "@/server/services/invoice";

describe("GST invoice generation (integration, hits the real dev DB)", () => {
  const suffix = Date.now();
  let stateId: string;
  let cityId: string;
  let vendorUserId: string;
  let vendorId: string;
  let customerId: string;
  let bookingId: string;

  afterAll(async () => {
    await db.invoice.deleteMany({ where: { bookingId } });
    await db.bookingItem.deleteMany({ where: { bookingId } });
    await db.booking.deleteMany({ where: { id: bookingId } });
    await db.vendorProfile.deleteMany({ where: { id: vendorId } });
    await db.user.deleteMany({ where: { id: { in: [vendorUserId, customerId] } } });
    await db.city.deleteMany({ where: { id: cityId } });
    await db.state.deleteMany({ where: { id: stateId } });
    await db.$disconnect();
  });

  it("sets up a vendor, customer, and a completed booking", async () => {
    const state = await db.state.create({
      data: { name: `Invoice Test State ${suffix}`, slug: `invoice-test-state-${suffix}` },
    });
    stateId = state.id;

    const city = await db.city.create({
      data: {
        name: `Invoice Test City ${suffix}`,
        slug: `invoice-test-city-${suffix}`,
        stateId: state.id,
        lat: 28.6,
        lng: 77.2,
      },
    });
    cityId = city.id;

    const vendorUser = await db.user.create({
      data: { email: `invoice-vendor-${suffix}@example.com`, role: "VENDOR" },
    });
    vendorUserId = vendorUser.id;

    const vendor = await db.vendorProfile.create({
      data: {
        userId: vendorUser.id,
        businessName: `Glow Test Salon ${suffix}`,
        slug: `glow-test-salon-${suffix}`,
        gstin: "07AAAAA0000A1Z5",
        cityId: city.id,
        isPublished: true,
      },
    });
    vendorId = vendor.id;

    const customer = await db.user.create({
      data: {
        email: `invoice-customer-${suffix}@example.com`,
        role: "CUSTOMER",
        name: "Test Customer",
      },
    });
    customerId = customer.id;

    const booking = await db.booking.create({
      data: {
        bookingNo: `INV-TEST-${suffix}`,
        customerId: customer.id,
        ownerType: "VENDOR",
        ownerId: vendor.id,
        type: "IN_STUDIO",
        scheduledAt: new Date(),
        durationMin: 60,
        status: "COMPLETED",
        subtotalPaise: 100_000,
        discountPaise: 10_000,
        taxPaise: 16_200, // 18% of (100,000 - 10,000)
        totalPaise: 106_200,
        items: {
          create: [
            {
              titleSnapshot: "Bridal Makeup",
              unitPricePaise: 100_000,
              qty: 1,
              lineTotalPaise: 100_000,
            },
          ],
        },
      },
    });
    bookingId = booking.id;
  });

  it("generates a sequential invoice number and a correct CGST/SGST split", async () => {
    const invoice = await ensureInvoiceForBooking(bookingId);

    expect(invoice.invoiceNumber).toMatch(/^INV-\d{4}-\d{6}$/);
    expect(invoice.sellerName).toContain("Glow Test Salon");
    expect(invoice.sellerGstin).toBe("07AAAAA0000A1Z5");
    expect(invoice.taxableAmountPaise).toBe(90_000); // subtotal - discount
    expect(invoice.cgstPaise + invoice.sgstPaise).toBe(16_200);
    expect(invoice.cgstPaise).toBe(invoice.sgstPaise); // even split, intra-state assumption
    expect(invoice.totalPaise).toBe(106_200);
  });

  it("is idempotent — calling it again for the same booking returns the same invoice", async () => {
    const first = await ensureInvoiceForBooking(bookingId);
    const second = await ensureInvoiceForBooking(bookingId);
    expect(second.id).toBe(first.id);
    expect(second.invoiceNumber).toBe(first.invoiceNumber);

    const count = await db.invoice.count({ where: { bookingId } });
    expect(count).toBe(1);
  });

  it("renders a non-empty PDF", async () => {
    const pdf = await renderInvoicePdf(bookingId);
    expect(pdf).not.toBeNull();
    expect(pdf!.length).toBeGreaterThan(100);
    expect(pdf!.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("returns null for a booking with no invoice yet", async () => {
    const pdf = await renderInvoicePdf("nonexistent-booking-id");
    expect(pdf).toBeNull();
  });
});
