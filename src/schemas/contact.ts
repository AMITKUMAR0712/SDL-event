import { z } from "zod";

export const contactMessageSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.email("Enter a valid email address"),
  phone: z.string().optional(),
  message: z.string().min(10, "Tell us a bit more (at least 10 characters)"),
});
export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
