"use server";

import { headers } from "next/headers";

import { rateLimit } from "@/lib/rate-limit";
import { ContactMessageInput, contactMessageSchema } from "@/schemas/contact";
import { ActionResult } from "@/server/actions/auth";
import { submitContactMessage } from "@/server/services/contact";

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function submitContactMessageAction(
  input: ContactMessageInput,
): Promise<ActionResult> {
  const parsed = contactMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ip = await clientIp();
  const limit = await rateLimit(`contact-message:${ip}`, 5, 60 * 60);
  if (!limit.allowed) {
    return { ok: false, error: "Too many messages sent. Please try again later." };
  }

  await submitContactMessage(parsed.data);
  return { ok: true, data: undefined };
}
