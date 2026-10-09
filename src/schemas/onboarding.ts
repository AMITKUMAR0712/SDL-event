import { z } from "zod";

import { bookingContactPhoneSchema } from "@/schemas/booking";

export const vendorOnboardingSchema = z.object({
  businessName: z.string().min(2, "Business name is too short"),
  cityId: z.string().min(1, "Choose a city"),
  localityId: z.string().optional(),
  addressLine1: z.string().min(4, "Enter your street address"),
  pincode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  // Required to charge the subscription (Cashfree's order API needs a
  // customer phone) — collected here rather than at registration since not
  // every signup method (e.g. email/password) asks for one.
  phone: bookingContactPhoneSchema,
  servesInStudio: z.boolean(),
  servesAtHome: z.boolean(),
  homeServiceRadiusKm: z.number().int().min(0).max(50),
  serviceCatalogIds: z.array(z.string()).min(1, "Choose at least one service"),
  gstin: z.string().optional(),
  panMasked: z.string().optional(),
  planCode: z.string().min(1, "Choose a plan"),
});
export type VendorOnboardingInput = z.infer<typeof vendorOnboardingSchema>;

export const banquetOnboardingSchema = z.object({
  venueName: z.string().min(2, "Venue name is too short"),
  cityId: z.string().min(1, "Choose a city"),
  localityId: z.string().optional(),
  addressLine1: z.string().min(4, "Enter your street address"),
  pincode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  // Required to charge the subscription (Cashfree's order API needs a
  // customer phone) — collected here rather than at registration since not
  // every signup method (e.g. email/password) asks for one.
  phone: bookingContactPhoneSchema,
  totalHalls: z.number().int().min(1).max(20),
  vegPricePerPlatePaise: z.number().int().min(0),
  nonVegPricePerPlatePaise: z.number().int().min(0),
  planCode: z.string().min(1, "Choose a plan"),
});
export type BanquetOnboardingInput = z.infer<typeof banquetOnboardingSchema>;
