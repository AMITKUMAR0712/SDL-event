import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { ContactMessageInput } from "@/schemas/contact";
import { sendEmail } from "@/server/services/email";

// The site's own published contact address (shown on /contact, in the
// footer, on WhatsApp) — submissions land here so the owner sees every
// enquiry without needing to check an admin dashboard.
const SITE_CONTACT_EMAIL = "info@sajdhajlo.com";

export async function submitContactMessage(input: ContactMessageInput) {
  const saved = await db.contactMessage.create({ data: input });

  // The message is already durably saved and visible in
  // /dashboard/admin/messages — an email provider outage shouldn't make the
  // visitor's submission look like it failed.
  try {
    await sendEmail({
      to: SITE_CONTACT_EMAIL,
      subject: `New contact form message from ${input.name}`,
      html: `
        <p><strong>Name:</strong> ${input.name}</p>
        <p><strong>Email:</strong> ${input.email}</p>
        <p><strong>Phone:</strong> ${input.phone || "-"}</p>
        <p><strong>Message:</strong></p>
        <p>${input.message.replace(/\n/g, "<br />")}</p>
      `,
    });
  } catch (error) {
    logger.error("[contact] notification email failed", { error, contactMessageId: saved.id });
  }

  return saved;
}
