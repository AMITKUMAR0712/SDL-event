import { z } from "zod";

export const createBeautyBookingSchema = z.object({
  vendorId: z.string().min(1),
  vendorServiceIds: z.array(z.string()).min(1, "Choose at least one service"),
  type: z.enum(["IN_STUDIO", "AT_HOME"]),
  scheduledAt: z.coerce.date(),
  addressId: z.string().optional(),
  couponCode: z.string().optional(),
});
export type CreateBeautyBookingInput = z.infer<typeof createBeautyBookingSchema>;

export const createVenueEnquirySchema = z.object({
  banquetId: z.string().min(1),
  hallId: z.string().optional(),
  scheduledAt: z.coerce.date(),
  guestCount: z.coerce.number().int().min(1),
  plateType: z.enum(["VEG", "NON_VEG"]),
});
export type CreateVenueEnquiryInput = z.infer<typeof createVenueEnquirySchema>;

export const reviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().optional(),
  body: z.string().optional(),
});
export type ReviewInput = z.infer<typeof reviewSchema>;
