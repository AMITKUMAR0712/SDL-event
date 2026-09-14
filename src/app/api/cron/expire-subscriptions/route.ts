import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { expireOverdueSubscriptions } from "@/server/services/subscription";

export const runtime = "nodejs";

/**
 * Meant to be hit by an external scheduler (Vercel Cron / GitHub Actions cron)
 * daily. Unpublishes vendors/banquets whose subscription period has lapsed —
 * a backstop for listings nobody has visited recently; visiting a profile or
 * dashboard already triggers the same check on the spot (see
 * server/services/subscription.ts).
 */
export async function POST(request: Request) {
  if (!env.CRON_SECRET) {
    logger.warn("[cron] CRON_SECRET not set — refusing to run expire-subscriptions");
    return new NextResponse("Not configured", { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const count = await expireOverdueSubscriptions();
  return NextResponse.json({ expired: count });
}
