import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export function getAvailabilityFor(ownerType: "VENDOR" | "BANQUET", ownerId: string) {
  return db.availability.findMany({ where: { ownerType, ownerId } });
}

export function getBlockedDatesFor(ownerType: "VENDOR" | "BANQUET", ownerId: string) {
  return db.blockedDate.findMany({ where: { ownerType, ownerId } });
}

export function getBusyIntervalsFor(ownerType: "VENDOR" | "BANQUET", ownerId: string, day: Date) {
  const dayStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  return db.booking.findMany({
    where: {
      ownerType,
      ownerId,
      status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
      scheduledAt: { gte: dayStart, lt: dayEnd },
    },
    select: { scheduledAt: true, durationMin: true },
  });
}

export function generateBookingNo(): string {
  return `MGO${Date.now().toString(36).toUpperCase()}`;
}

export function createBooking(data: Prisma.BookingCreateInput) {
  return db.booking.create({ data, include: { items: true } });
}

export function findBookingById(id: string) {
  return db.booking.findUnique({ where: { id }, include: { items: true } });
}

export function findBookingsForCustomer(customerId: string) {
  return db.booking.findMany({
    where: { customerId },
    orderBy: { scheduledAt: "desc" },
    include: { items: true, review: true },
  });
}

export function findBookingsForOwner(ownerType: "VENDOR" | "BANQUET", ownerId: string) {
  return db.booking.findMany({
    where: { ownerType, ownerId },
    orderBy: { scheduledAt: "asc" },
    include: { items: true, customer: { select: { name: true, phone: true } } },
  });
}

export function updateBookingStatus(id: string, data: Prisma.BookingUpdateInput) {
  return db.booking.update({ where: { id }, data });
}
