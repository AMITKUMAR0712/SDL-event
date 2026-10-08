"use server";

import { auth } from "@/lib/auth";
import { requireOwnership, requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import {
  createBeautyBookingSchema,
  createVenueEnquirySchema,
  reviewSchema,
} from "@/schemas/booking";
import type { ActionResult } from "@/server/actions/auth";
import { findBookingById } from "@/server/repositories/booking";
import {
  createBeautyBooking,
  createVenueEnquiry,
  resolveBookingCustomerId,
  transitionBooking,
} from "@/server/services/booking";
import type { BookingStatus } from "@/server/services/booking-status";
import { createReview, replyToReview } from "@/server/services/review";
import {
  generateServiceStartOtp,
  verifyServiceStartOtp,
} from "@/server/services/service-start-otp";

// These two are reachable from public, guest-visible pages (vendor/banquet
// profiles) and deliberately allow guest checkout — a signed-in CUSTOMER
// books as themselves, anyone else (including a VENDOR/BANQUET_OWNER
// browsing while logged into their own account) is matched to a CUSTOMER
// record by the phone number the booking form itself already collects. See
// resolveBookingCustomerId.
export async function createBeautyBookingAction(
  input: unknown,
): Promise<ActionResult<{ bookingId: string; bookingNo: string }>> {
  const parsed = createBeautyBookingSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await auth();
  const customerId = await resolveBookingCustomerId(session?.user, parsed.data.contactPhone);

  const limit = await rateLimit(`booking-create:${customerId}`, 10, 60 * 60);
  if (!limit.allowed) {
    return { ok: false, error: "Too many booking attempts. Try again later." };
  }

  const result = await createBeautyBooking({ ...parsed.data, customerId });
  if (!result.ok) {
    const messages: Record<string, string> = {
      VENDOR_NOT_FOUND: "This vendor is no longer available.",
      SERVICES_NOT_FOUND: "The selected services are no longer available.",
      MIN_ORDER_NOT_MET: "This order doesn't meet the vendor's minimum for at-home service.",
      OUT_OF_RADIUS: "This address is outside the vendor's home-service area.",
      SLOT_UNAVAILABLE: "That time is no longer available — please pick another slot.",
      COUPON_INVALID: "That coupon code isn't valid for this order.",
    };
    return { ok: false, error: messages[result.reason] };
  }
  return { ok: true, data: { bookingId: result.bookingId, bookingNo: result.bookingNo } };
}

export async function createVenueEnquiryAction(
  input: unknown,
): Promise<ActionResult<{ bookingId: string; bookingNo: string }>> {
  const parsed = createVenueEnquirySchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const session = await auth();
  const customerId = await resolveBookingCustomerId(session?.user, parsed.data.contactPhone);

  const limit = await rateLimit(`booking-create:${customerId}`, 10, 60 * 60);
  if (!limit.allowed) {
    return { ok: false, error: "Too many booking attempts. Try again later." };
  }

  const result = await createVenueEnquiry({ ...parsed.data, customerId });
  if (!result.ok) return { ok: false, error: "This venue is no longer available." };
  return { ok: true, data: { bookingId: result.bookingId, bookingNo: result.bookingNo } };
}

async function assertBookingAccess(bookingId: string) {
  const booking = await findBookingById(bookingId);
  if (!booking) throw new Error("Booking not found");
  await requireOwnership(booking.ownerId);
  return booking;
}

export async function transitionBookingAction(
  bookingId: string,
  to: BookingStatus,
): Promise<ActionResult> {
  const session = await requireRole(["CUSTOMER", "VENDOR", "BANQUET_OWNER", "ADMIN", "SUPPORT"]);
  const booking = await findBookingById(bookingId);
  if (!booking) return { ok: false, error: "Booking not found." };

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPPORT";
  const isOwner =
    session.user.vendorId === booking.ownerId || session.user.banquetId === booking.ownerId;
  const isCustomer = session.user.id === booking.customerId;
  if (!isAdmin && !isOwner && !isCustomer) {
    return { ok: false, error: "You don't have permission to do that." };
  }

  const actor = isAdmin ? "ADMIN" : isOwner ? "OWNER" : "CUSTOMER";
  const result = await transitionBooking(bookingId, to, actor);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === "NOT_FOUND" ? "Booking not found." : "That status change isn't allowed.",
    };
  }
  return { ok: true, data: undefined };
}

export async function requestServiceStartOtpAction(
  bookingId: string,
): Promise<ActionResult<{ code: string }>> {
  const session = await requireRole(["CUSTOMER"]);
  const booking = await findBookingById(bookingId);
  if (!booking || booking.customerId !== session.user.id) {
    return { ok: false, error: "Booking not found." };
  }
  const code = await generateServiceStartOtp(bookingId);
  // Shown directly to the customer (they're present at the visit already) —
  // no SMS channel needed. Returned in the action result, not stored/logged.
  return { ok: true, data: { code } };
}

export async function startServiceWithOtpAction(
  bookingId: string,
  code: string,
): Promise<ActionResult> {
  await assertBookingAccess(bookingId);
  const valid = await verifyServiceStartOtp(bookingId, code);
  if (!valid) return { ok: false, error: "Incorrect or expired code." };

  const result = await transitionBooking(bookingId, "IN_PROGRESS", "OWNER");
  if (!result.ok) return { ok: false, error: "That status change isn't allowed." };
  return { ok: true, data: undefined };
}

export async function createReviewAction(input: unknown): Promise<ActionResult> {
  const session = await requireRole(["CUSTOMER"]);
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const result = await createReview(
    parsed.data.bookingId,
    session.user.id,
    parsed.data.rating,
    parsed.data.title,
    parsed.data.body,
  );
  if (!result.ok) {
    const messages: Record<string, string> = {
      BOOKING_NOT_FOUND: "Booking not found.",
      NOT_COMPLETED: "You can only review a completed booking.",
      NOT_YOUR_BOOKING: "This isn't your booking.",
      ALREADY_REVIEWED: "You've already reviewed this booking.",
    };
    return { ok: false, error: messages[result.reason] };
  }
  return { ok: true, data: undefined };
}

export async function replyToReviewAction(reviewId: string, reply: string): Promise<ActionResult> {
  const session = await requireRole(["VENDOR", "BANQUET_OWNER"]);
  const review = await db.review.findUnique({ where: { id: reviewId } });
  if (!review) return { ok: false, error: "Review not found." };
  const owns =
    session.user.vendorId === review.ownerId || session.user.banquetId === review.ownerId;
  if (!owns) return { ok: false, error: "You don't have permission to do that." };

  await replyToReview(reviewId, reply);
  return { ok: true, data: undefined };
}
