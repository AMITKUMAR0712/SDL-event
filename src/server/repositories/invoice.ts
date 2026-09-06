import { db } from "@/lib/db";

export function findInvoiceByBookingId(bookingId: string) {
  return db.invoice.findUnique({ where: { bookingId } });
}

export function findInvoiceWithBooking(bookingId: string) {
  return db.invoice.findUnique({
    where: { bookingId },
    include: { booking: { include: { items: true, customer: true } } },
  });
}
