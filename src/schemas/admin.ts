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
