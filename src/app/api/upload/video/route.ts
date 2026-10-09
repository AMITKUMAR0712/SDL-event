import { NextResponse } from "next/server";

import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/authz";
import { uploadVideoToCloudinary } from "@/server/services/upload";

export const runtime = "nodejs";

const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB — short popup/guide clips only
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm", "video/ogg", "video/quicktime"]);

/**
 * A plain route handler, not a server action — see the comment in
 * src/app/api/upload/image/route.ts for why. Video is where this mattered
 * most: a real ~1-minute clip is comfortably over the point where the
 * server-action upload path stopped responding at all.
 */
export async function POST(request: Request) {
  try {
    await requireRole(["ADMIN"]);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
    }
    throw error;
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No file provided." }, { status: 400 });
  }
  if (!VIDEO_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { ok: false, error: "File must be an MP4, WebM, Ogg, or MOV video." },
      { status: 400 },
    );
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Video is too large (max 100MB)." },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await uploadVideoToCloudinary(buffer);
    return NextResponse.json({ ok: true, data: { url } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json(
      { ok: false, error: `Couldn't upload that video: ${message}` },
      { status: 502 },
    );
  }
}
