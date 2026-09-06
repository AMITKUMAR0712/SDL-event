import { NextResponse } from "next/server";

import { env } from "@/lib/env";

/** Proves ownership of the domain to IndexNow — see `server/services/search-engine-ping.ts`. */
export function GET() {
  if (!env.INDEXNOW_KEY) {
    return new NextResponse("Not found", { status: 404 });
  }
  return new NextResponse(env.INDEXNOW_KEY, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
