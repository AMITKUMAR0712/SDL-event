import { db } from "@/lib/db";
import { percentOfPaise } from "@/lib/money";
import {
  createBooking,
  findBookingById,
  generateBookingNo,
  getAvailabilityFor,
  getBlockedDatesFor,
  getBusyIntervalsFor,
  updateBookingStatus,
} from "@/server/repositories/booking";
import { getSetting } from "@/server/repositories/settings";
import {
  allowedNextStatuses,
  BookingActor,
  BookingStatus,
  canTransition,
  refundPercentFor,
} from "@/server/services/booking-status";
import { redeemCoupon, validateCoupon } from "@/server/services/coupon";
import { generateSlots } from "@/server/services/slots";
import { creditBookingEarning } from "@/server/services/wallet";

const GST_PERCENT_DEFAULT = 18;

export async function getAvailableSlots(
  ownerType: "VENDOR" | "BANQUET",
  ownerId: string,
  day: Date,
  serviceDurationMin: number,
  travelTimeMin = 0,
) {
  const [availability, blockedDates, busy] = await Promise.all([
    getAvailabilityFor(ownerType, ownerId),
    getBlockedDatesFor(ownerType, ownerId),
    getBusyIntervalsFor(ownerType, ownerId, day),
  ]);

  return generateSlots({
    day,
    availability: availability.map((a) => ({
      weekday: a.weekday,
      startMinute: a.startTime.getUTCHours() * 60 + a.startTime.getUTCMinutes(),
      endMinute: a.endTime.getUTCHours() * 60 + a.endTime.getUTCMinutes(),
    })),
    blockedDates: blockedDates.map((b) => b.date),
    existingBookings: busy.map((b) => ({
      start: b.scheduledAt,
      end: new Date(b.scheduledAt.getTime() + b.durationMin * 60_000),
    })),
    serviceDurationMin,
    travelTimeMin,
    bufferMin: 15,
  });
}

export type CreateBeautyBookingInput = {
  customerId: string;
  vendorId: string;
  vendorServiceIds: string[];
  type: "IN_STUDIO" | "AT_HOME";
  scheduledAt: Date;
  addressId?: string;
  couponCode?: string;
};

export type CreateBookingResult =
  | { ok: true; bookingId: string; bookingNo: string }
  | {
      ok: false;
      reason:
        | "VENDOR_NOT_FOUND"
        | "SERVICES_NOT_FOUND"
        | "MIN_ORDER_NOT_MET"
        | "OUT_OF_RADIUS"
        | "SLOT_UNAVAILABLE"
        | "COUPON_INVALID";
    };

export async function createBeautyBooking(
  input: CreateBeautyBookingInput,
): Promise<CreateBookingResult> {
  const vendor = await db.vendorProfile.findUnique({ where: { id: input.vendorId } });
  if (!vendor || !vendor.isPublished) return { ok: false, reason: "VENDOR_NOT_FOUND" };

  const services = await db.vendorService.findMany({
    where: { id: { in: input.vendorServiceIds }, vendorId: input.vendorId, isActive: true },
  });
  if (services.length === 0) return { ok: false, reason: "SERVICES_NOT_FOUND" };

  const subtotalPaise = services.reduce((sum, s) => sum + s.pricePaise, 0);
  const travelFeePaise = input.type === "AT_HOME" ? vendor.travelFeePaise : 0;

  if (input.type === "AT_HOME" && subtotalPaise < vendor.homeServiceMinOrderPaise) {
    return { ok: false, reason: "MIN_ORDER_NOT_MET" };
  }

  const durationMin = services.reduce((sum, s) => sum + s.durationMin, 0);
  const busy = await getBusyIntervalsFor("VENDOR", input.vendorId, input.scheduledAt);
  const requestedEnd = new Date(input.scheduledAt.getTime() + durationMin * 60_000);
  const conflict = busy.some(
    (b) =>
      input.scheduledAt < new Date(b.scheduledAt.getTime() + b.durationMin * 60_000) &&
      b.scheduledAt < requestedEnd,
  );
  if (conflict) return { ok: false, reason: "SLOT_UNAVAILABLE" };

  let discountPaise = 0;
  if (input.couponCode) {
    const validation = await validateCoupon(
      input.couponCode,
      "BOOKING",
      subtotalPaise,
      input.customerId,
    );
    if (!validation.ok) return { ok: false, reason: "COUPON_INVALID" };
    discountPaise = validation.discountPaise;
  }

  const gstPercent = await getSetting("gst_percent", GST_PERCENT_DEFAULT);
  const taxableAmount = Math.max(0, subtotalPaise - discountPaise);
  const taxPaise = percentOfPaise(taxableAmount, gstPercent);
  const commissionPercent = await getSetting("commission_percent_beauty", 15);
  const totalPaise = taxableAmount + travelFeePaise + taxPaise;

  const booking = await createBooking({
    bookingNo: generateBookingNo(),
    customer: { connect: { id: input.customerId } },
    ownerType: "VENDOR",
    ownerId: input.vendorId,
    type: input.type,
    scheduledAt: input.scheduledAt,
    durationMin,
    ...(input.addressId ? { address: { connect: { id: input.addressId } } } : {}),
    status: "PENDING",
    subtotalPaise,
    discountPaise,
    travelFeePaise,
    taxPaise,
    totalPaise,
    commissionPaise: percentOfPaise(taxableAmount, commissionPercent),
    ...(input.couponCode ? { coupon: { connect: { code: input.couponCode.toUpperCase() } } } : {}),
    items: {
      create: services.map((s) => ({
        vendorServiceId: s.id,
        titleSnapshot: s.title,
        unitPricePaise: s.pricePaise,
        qty: 1,
        lineTotalPaise: s.pricePaise,
      })),
    },
  });

  if (input.couponCode) {
    await redeemCoupon(input.couponCode, "BOOKING", subtotalPaise, input.customerId, {
      bookingId: booking.id,
    });
  }

  return { ok: true, bookingId: booking.id, bookingNo: booking.bookingNo };
}

export type CreateVenueEnquiryInput = {
  customerId: string;
  banquetId: string;
  hallId?: string;
  scheduledAt: Date;
  guestCount: number;
  plateType: "VEG" | "NON_VEG";
};

export async function createVenueEnquiry(
  input: CreateVenueEnquiryInput,
): Promise<CreateBookingResult> {
  const banquet = await db.banquetProfile.findUnique({ where: { id: input.banquetId } });
  if (!banquet || !banquet.isPublished) return { ok: false, reason: "VENDOR_NOT_FOUND" };

  const perPlate =
    input.plateType === "VEG" ? banquet.vegPricePerPlatePaise : banquet.nonVegPricePerPlatePaise;
  const subtotalPaise = (perPlate ?? 0) * input.guestCount;
  const gstPercent = await getSetting("gst_percent", GST_PERCENT_DEFAULT);
  const taxPaise = percentOfPaise(subtotalPaise, gstPercent);
  const commissionPercent = await getSetting("commission_percent_banquet", 10);

  const booking = await createBooking({
    bookingNo: generateBookingNo(),
    customer: { connect: { id: input.customerId } },
    ownerType: "BANQUET",
    ownerId: input.banquetId,
    type: "VENUE",
    scheduledAt: input.scheduledAt,
    durationMin: 240,
    status: "PENDING",
    subtotalPaise,
    taxPaise,
    totalPaise: subtotalPaise + taxPaise,
    commissionPaise: percentOfPaise(subtotalPaise, commissionPercent),
    notes: `Guests: ${input.guestCount}, plate: ${input.plateType}${input.hallId ? `, hall: ${input.hallId}` : ""}`,
  });

  return { ok: true, bookingId: booking.id, bookingNo: booking.bookingNo };
}

export type TransitionResult =
  { ok: true } | { ok: false; reason: "NOT_FOUND" | "INVALID_TRANSITION" };

export async function transitionBooking(
  bookingId: string,
  to: BookingStatus,
  actor: BookingActor,
): Promise<TransitionResult> {
  const booking = await findBookingById(bookingId);
  if (!booking) return { ok: false, reason: "NOT_FOUND" };
  if (!canTransition(booking.status, to, actor)) return { ok: false, reason: "INVALID_TRANSITION" };

  if (to === "CANCELLED") {
    const policy = await getSetting("cancellation_policy", {
      fullRefundBeforeHours: 24,
      partialRefundPercent: 50,
      partialRefundBeforeHours: 4,
    });
    const refundPercent = refundPercentFor(booking.scheduledAt, new Date(), policy);
    const refundPaise = percentOfPaise(booking.totalPaise, refundPercent);
    await updateBookingStatus(bookingId, {
      status: to,
      cancelledBy: actor,
      discountPaise: booking.totalPaise - refundPaise,
    });
    return { ok: true };
  }

  await updateBookingStatus(bookingId, { status: to });

  if (to === "COMPLETED") {
    await creditBookingEarning(booking);
  }

  return { ok: true };
}

export function legalNextStatuses(status: BookingStatus, actor: BookingActor) {
  return allowedNextStatuses(status, actor);
}
