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
  isActive: z.coerce.boolean().default(true),
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

export const planFeatureAdminSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["INT", "BOOL", "TEXT"]),
  valueInt: z.coerce.number().int().optional(),
  valueBool: z.coerce.boolean().optional(),
  valueText: z.string().optional(),
});
export type PlanFeatureAdminInput = z.infer<typeof planFeatureAdminSchema>;

export const planAdminSchema = z.object({
  audience: z.enum(["VENDOR", "BANQUET", "CUSTOMER"]),
  code: z
    .string()
    .min(2)
    .regex(/^[A-Z0-9_]+$/, "Uppercase letters, numbers, and underscores only"),
  name: z.string().min(2),
  description: z.string().optional(),
  pricePaise: z.coerce.number().int().min(0),
  compareAtPricePaise: z.coerce.number().int().optional(),
  billingPeriod: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"]),
  trialDays: z.coerce.number().int().min(0).default(0),
  isActive: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
  features: z.array(planFeatureAdminSchema).default([]),
});
export type PlanAdminInput = z.infer<typeof planAdminSchema>;
