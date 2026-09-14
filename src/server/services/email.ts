import nodemailer from "nodemailer";
import { Resend } from "resend";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

let resendClient: Resend | undefined;
function getResendClient(): Resend {
  resendClient ??= new Resend(env.RESEND_API_KEY);
  return resendClient;
}

let gmailTransport: nodemailer.Transporter | undefined;
function getGmailTransport(): nodemailer.Transporter {
  gmailTransport ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
  });
  return gmailTransport;
}

/**
 * Resend is preferred when configured; Gmail SMTP (an app password, not the
 * account password) is the fallback so the site can send real mail without
 * a Resend account. If neither is set, the email is logged instead of sent —
 * safe for local dev, never true in production once one path is configured.
 */
export async function sendEmail(input: { to: string; subject: string; html: string }) {
  if (env.RESEND_API_KEY) {
    const { error } = await getResendClient().emails.send({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    if (error) {
      logger.error("[email] Resend send failed", { error });
      throw new Error("Failed to send email");
    }
    return;
  }

  if (env.GMAIL_USER && env.GMAIL_APP_PASSWORD) {
    try {
      await getGmailTransport().sendMail({
        from: env.EMAIL_FROM || env.GMAIL_USER,
        to: input.to,
        subject: input.subject,
        html: input.html,
      });
    } catch (error) {
      logger.error("[email] Gmail SMTP send failed", { error });
      throw new Error("Failed to send email");
    }
    return;
  }

  logger.warn("[email] No email provider configured — logging email instead of sending", input);
}
