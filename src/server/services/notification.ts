import type { NotificationChannel } from "@prisma/client";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/server/services/email";

export type NotificationTemplate = "booking.created.owner" | "kyc.approved" | "kyc.rejected";

type TemplatePayloads = {
  "booking.created.owner": { bookingNo: string; scheduledAt: string };
  "kyc.approved": { name: string; profileUrl: string };
  "kyc.rejected": { name: string };
};

function renderEmail<T extends NotificationTemplate>(
  template: T,
  payload: TemplatePayloads[T],
): { subject: string; html: string } {
  switch (template) {
    case "booking.created.owner": {
      const p = payload as TemplatePayloads["booking.created.owner"];
      return {
        subject: `New booking request — ${p.bookingNo}`,
        html: `<p>You have a new booking request (#${p.bookingNo}) for ${new Date(p.scheduledAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}. Log in to your dashboard to confirm or decline.</p>`,
      };
    }
    case "kyc.approved": {
      const p = payload as TemplatePayloads["kyc.approved"];
      return {
        subject: "Your SajDhajLo listing is live",
        html: `<p>Your profile "${p.name}" has been approved and is now live on SajDhajLo. <a href="${p.profileUrl}">View it here</a>.</p>`,
      };
    }
    case "kyc.rejected": {
      const p = payload as TemplatePayloads["kyc.rejected"];
      return {
        subject: "Your SajDhajLo listing needs changes",
        html: `<p>Your profile "${p.name}" was not approved this time. Please review your details and resubmit.</p>`,
      };
    }
  }
}

/**
 * Creates a `Notification` row and attempts delivery immediately. Never
 * throws — a notification failing to send must never fail the booking/KYC
 * mutation that triggered it; the row's `status` records the outcome, and
 * `retryPendingNotifications` sweeps anything left `PENDING`/`FAILED`.
 */
export async function notify<T extends NotificationTemplate>(
  userId: string,
  channel: NotificationChannel,
  template: T,
  payload: TemplatePayloads[T],
) {
  const notification = await db.notification.create({
    data: { userId, channel, template, payload, status: "PENDING" },
  });
  await dispatch(notification.id);
  return notification;
}

async function dispatch(notificationId: string): Promise<void> {
  const notification = await db.notification.findUnique({
    where: { id: notificationId },
    include: { user: true },
  });
  if (!notification) return;

  try {
    if (notification.channel === "EMAIL") {
      if (!notification.user.email) throw new Error("User has no email on file");
      const { subject, html } = renderEmail(
        notification.template as NotificationTemplate,
        notification.payload as never,
      );
      await sendEmail({ to: notification.user.email, subject, html });
    } else if (notification.channel === "IN_APP") {
      // No external delivery — the row itself is what an in-app notification
      // center would read. Creating it is the delivery.
    } else {
      // SMS/WhatsApp free-text sends require a DLT-registered template
      // (India's TRAI rules) / an approved WhatsApp template — neither is
      // provisioned yet, so there's nothing to send to; see CHANGELOG.
      throw new Error(`${notification.channel} requires an approved template, none is configured`);
    }

    await db.notification.update({
      where: { id: notificationId },
      data: { status: "SENT", sentAt: new Date() },
    });
  } catch (error) {
    logger.error("[notification] dispatch failed", {
      notificationId,
      channel: notification.channel,
      error: String(error),
    });
    await db.notification.update({
      where: { id: notificationId },
      data: { status: "FAILED" },
    });
  }
}

/** Re-attempts anything not currently SENT. Meant to be called by a scheduled job. */
export async function retryPendingNotifications(limit = 50): Promise<number> {
  const stuck = await db.notification.findMany({
    where: { status: { in: ["PENDING", "FAILED", "RETRYING"] } },
    take: limit,
    orderBy: { createdAt: "asc" },
  });

  for (const row of stuck) {
    await db.notification.update({ where: { id: row.id }, data: { status: "RETRYING" } });
    await dispatch(row.id);
  }

  return stuck.length;
}
