"use server";

import { requireOwnership, requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
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
  transitionBooking,
} from "@/server/services/booking";
import type { BookingStatus } from "@/server/services/booking-status";
import { createReview, replyToReview } from "@/server/services/review";
import {
  generateServiceStartOtp,
  verifyServiceStartOtp,
} from "@/server/services/service-start-otp";

// These two are reachable from public, guest-visible pages (vendor/banquet
// profiles), unlike every other action in this file which only renders
// behind an already-role-gated dashboard/account page — so a plain
// UnauthorizedError from requireRole is a real, expected case here and
// needs to become a friendly message rather than an unhandled 500.
export async function createBeautyBookingAction(
  input: unknown,
): Promise<ActionResult<{ bookingId: string; bookingNo: string }>> {
  let session;
  try {
    session = await requireRole(["CUSTOMER"]);
  } catch {
    return { ok: false, error: "Sign in as a customer to book." };
  }

  const parsed = createBeautyBookingSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const result = await createBeautyBooking({ ...parsed.data, customerId: session.user.id });
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
  let session;
  try {
    session = await requireRole(["CUSTOMER"]);
  } catch {
    return { ok: false, error: "Sign in as a customer to send an enquiry." };
  }

  const parsed = createVenueEnquirySchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const result = await createVenueEnquiry({ ...parsed.data, customerId: session.user.id });
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
