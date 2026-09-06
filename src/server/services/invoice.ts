import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import { db } from "@/lib/db";
import { paiseToRupees } from "@/lib/money";
import { findInvoiceByBookingId, findInvoiceWithBooking } from "@/server/repositories/invoice";

const RUPEE_FORMATTER = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * pdf-lib's standard (non-embedded) fonts use WinAnsiEncoding, which predates
 * Unicode's Rupee sign (₹, added 2010) and can't render it — drawText throws.
 * "Rs." is the standard workaround for PDFs built on the base-14 fonts.
 */
function formatPaiseAsRs(paise: number): string {
  return `Rs. ${RUPEE_FORMATTER.format(paiseToRupees(paise))}`;
}

/**
 * Creates the (immutable, once issued) GST invoice for a completed booking —
 * idempotent, so re-running it for an already-invoiced booking is a no-op.
 *
 * Simplification, documented rather than hidden: this always splits tax as
 * CGST+SGST (intra-state supply). The booking flow books a vendor/venue local
 * to the customer's own city, which covers the overwhelming majority of real
 * bookings, but doesn't reliably capture the customer's billing state — a
 * true inter-state IGST path would need that captured first.
 */
export async function ensureInvoiceForBooking(bookingId: string) {
  const existing = await findInvoiceByBookingId(bookingId);
  if (existing) return existing;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true },
  });
  if (!booking) throw new Error(`Booking ${bookingId} not found`);

  const owner =
    booking.ownerType === "VENDOR"
      ? await db.vendorProfile.findUnique({
          where: { id: booking.ownerId },
          include: { city: { include: { state: true } } },
        })
      : await db.banquetProfile.findUnique({
          where: { id: booking.ownerId },
          include: { city: { include: { state: true } } },
        });
  if (!owner) throw new Error(`Owner ${booking.ownerId} not found for booking ${bookingId}`);

  const sellerName = "businessName" in owner ? owner.businessName : owner.venueName;
  const taxableAmountPaise = booking.subtotalPaise - booking.discountPaise;
  const cgstPaise = Math.round(booking.taxPaise / 2);
  const sgstPaise = booking.taxPaise - cgstPaise;

  return db.$transaction(async (tx) => {
    const year = new Date().getFullYear();
    const sequence = await tx.invoiceSequence.upsert({
      where: { year },
      create: { year, counter: 1 },
      update: { counter: { increment: 1 } },
    });
    const invoiceNumber = `INV-${year}-${String(sequence.counter).padStart(6, "0")}`;

    return tx.invoice.create({
      data: {
        bookingId: booking.id,
        invoiceNumber,
        sellerName,
        sellerGstin: owner.gstin ?? undefined,
        sellerState: owner.city.state.name,
        buyerName: booking.customer.name ?? "Customer",
        taxableAmountPaise,
        cgstPaise,
        sgstPaise,
        igstPaise: 0,
        totalPaise: booking.totalPaise,
      },
    });
  });
}

export async function renderInvoicePdf(bookingId: string): Promise<Buffer | null> {
  const invoice = await findInvoiceWithBooking(bookingId);
  if (!invoice) return null;

  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 in points
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const left = 50;
  const line = (text: string, opts: { size?: number; bold?: boolean; gap?: number } = {}) => {
    page.drawText(text, {
      x: left,
      y,
      size: opts.size ?? 11,
      font: opts.bold ? bold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= opts.gap ?? 18;
  };

  line("Tax Invoice", { size: 20, bold: true, gap: 28 });
  line(`Invoice No: ${invoice.invoiceNumber}`);
  line(`Issue Date: ${invoice.issuedAt.toISOString().slice(0, 10)}`);
  line(`Booking No: ${invoice.booking.bookingNo}`, { gap: 26 });

  line("Seller", { bold: true });
  line(invoice.sellerName);
  line(`GSTIN: ${invoice.sellerGstin ?? "Not provided — buyer to verify before claiming ITC"}`);
  line(`State: ${invoice.sellerState}`, { gap: 26 });

  line("Buyer", { bold: true });
  line(invoice.buyerName, { gap: 26 });

  line("Line items", { bold: true });
  for (const item of invoice.booking.items) {
    line(`${item.titleSnapshot}  x${item.qty}  —  ${formatPaiseAsRs(item.lineTotalPaise)}`);
  }
  y -= 8;

  line(`Taxable value: ${formatPaiseAsRs(invoice.taxableAmountPaise)}`);
  if (invoice.booking.travelFeePaise > 0) {
    line(`Travel fee (not taxed): ${formatPaiseAsRs(invoice.booking.travelFeePaise)}`);
  }
  line(`CGST: ${formatPaiseAsRs(invoice.cgstPaise)}`);
  line(`SGST: ${formatPaiseAsRs(invoice.sgstPaise)}`);
  line(`Total: ${formatPaiseAsRs(invoice.totalPaise)}`, { bold: true, gap: 28 });

  line("This is a system-generated invoice.", { size: 9 });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
