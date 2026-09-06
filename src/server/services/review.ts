import { db } from "@/lib/db";

export type CreateReviewResult =
  | { ok: true }
  | {
      ok: false;
      reason: "BOOKING_NOT_FOUND" | "NOT_COMPLETED" | "NOT_YOUR_BOOKING" | "ALREADY_REVIEWED";
    };

export async function createReview(
  bookingId: string,
  authorId: string,
  rating: number,
  title: string | undefined,
  body: string | undefined,
): Promise<CreateReviewResult> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { review: true },
  });
  if (!booking) return { ok: false, reason: "BOOKING_NOT_FOUND" };
  if (booking.customerId !== authorId) return { ok: false, reason: "NOT_YOUR_BOOKING" };
  if (booking.status !== "COMPLETED") return { ok: false, reason: "NOT_COMPLETED" };
  if (booking.review) return { ok: false, reason: "ALREADY_REVIEWED" };

  await db.$transaction(async (tx) => {
    await tx.review.create({
      data: {
        bookingId,
        authorId,
        ownerType: booking.ownerType,
        ownerId: booking.ownerId,
        rating,
        title,
        body,
        status: "APPROVED",
      },
    });

    const stats = await tx.review.aggregate({
      where: { ownerType: booking.ownerType, ownerId: booking.ownerId, status: "APPROVED" },
      _avg: { rating: true },
      _count: true,
    });

    if (booking.ownerType === "VENDOR") {
      await tx.vendorProfile.update({
        where: { id: booking.ownerId },
        data: { ratingAvg: stats._avg.rating ?? 0, ratingCount: stats._count },
      });
    } else {
      await tx.banquetProfile.update({
        where: { id: booking.ownerId },
        data: { ratingAvg: stats._avg.rating ?? 0, ratingCount: stats._count },
      });
    }
  });

  return { ok: true };
}

export async function replyToReview(reviewId: string, reply: string) {
  return db.review.update({ where: { id: reviewId }, data: { reply, repliedAt: new Date() } });
}
