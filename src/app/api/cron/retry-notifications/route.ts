import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { retryPendingNotifications } from "@/server/services/notification";

export const runtime = "nodejs";

/**
 * Meant to be hit by an external scheduler (Vercel Cron / GitHub Actions cron)
 * every few minutes. Authenticated with a shared secret rather than a session,
 * since the caller isn't a logged-in user.
 */
export async function POST(request: Request) {
  if (!env.CRON_SECRET) {
    logger.warn("[cron] CRON_SECRET not set — refusing to run retry-notifications");
    return new NextResponse("Not configured", { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const count = await retryPendingNotifications();
  return NextResponse.json({ retried: count });
}
