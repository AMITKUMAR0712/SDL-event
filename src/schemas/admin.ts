import { z } from "zod";

export const couponAdminSchema = z.object({
  code: z.string().min(3),
  discountType: z.enum(["PERCENT", "FLAT"]),
  value: z.coerce.number().int().min(1),
  maxDiscountPaise: z.coerce.number().int().optional(),
  minOrderPaise: z.coerce.number().int().optional(),
  appliesTo: z.enum(["BOOKING", "SUBSCRIPTION", "UNLOCK"]),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});
export type CouponAdminInput = z.infer<typeof couponAdminSchema>;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const cityAdminSchema = z.object({
  name: z.string().min(2),
  slug: z.string().regex(slugPattern, "Lowercase letters, numbers, and hyphens only"),
  stateId: z.string().min(1),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  isActive: z.coerce.boolean().default(true),
  imageUrl: z.union([z.url(), z.literal("")]).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  introContent: z.string().optional(),
});
export type CityAdminInput = z.infer<typeof cityAdminSchema>;

export const categoryAdminSchema = z.object({
  name: z.string().min(2),
  slug: z.string().regex(slugPattern, "Lowercase letters, numbers, and hyphens only"),
  type: z.enum(["BEAUTY", "BANQUET"]),
  isActive: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
  imageUrl: z.union([z.url(), z.literal("")]).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  longDescription: z.string().optional(),
});
export type CategoryAdminInput = z.infer<typeof categoryAdminSchema>;
