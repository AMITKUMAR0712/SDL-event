import { db } from "@/lib/db";
import type { ContactMessageInput } from "@/schemas/contact";
import { sendEmail } from "@/server/services/email";

// The site's own published contact address (shown on /contact, in the
// footer, on WhatsApp) — submissions land here so the owner sees every
// enquiry without needing to check an admin dashboard.
const SITE_CONTACT_EMAIL = "glowmakeoverit@gmail.com";

export async function submitContactMessage(input: ContactMessageInput) {
  const saved = await db.contactMessage.create({ data: input });

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

  return saved;
}
