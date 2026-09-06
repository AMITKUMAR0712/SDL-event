import { Resend } from "resend";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

let client: Resend | undefined;
function getClient(): Resend {
  client ??= new Resend(env.RESEND_API_KEY);
  return client;
}

export async function sendEmail(input: { to: string; subject: string; html: string }) {
  if (!env.RESEND_API_KEY) {
    logger.warn("[email] RESEND_API_KEY not set — logging email instead of sending", input);
    return;
  }

  const { error } = await getClient().emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  if (error) {
    logger.error("[email] Resend send failed", { error });
    throw new Error("Failed to send email");
  }
}
