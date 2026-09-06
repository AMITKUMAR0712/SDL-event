import { z } from "zod";

export const searchParamsSchema = z.object({
  type: z.enum(["vendor", "banquet"]).default("vendor"),
  city: z.string().optional(),
  category: z.string().optional(),
  homeService: z.coerce.boolean().optional(),
  ratingMin: z.coerce.number().min(0).max(5).optional(),
  cursor: z.string().optional(),
});
export type SearchParamsInput = z.infer<typeof searchParamsSchema>;
