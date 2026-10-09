import { NextResponse } from "next/server";

import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/authz";
import { describeUploadError, uploadImageToCloudinary } from "@/server/services/upload";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * A plain route handler, not a server action — server actions decode an
 * uploaded file through React's RSC/busboy action-argument protocol, which
 * has real overhead on a large binary payload (a multi-minute hang on a
 * video upload, confirmed by direct comparison against this same file
 * uploaded straight through the Cloudinary SDK in ~30s). A route handler
 * reads the request body directly, without that layer.
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
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ ok: false, error: "File must be an image." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Image is too large (max 10MB)." },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await uploadImageToCloudinary(buffer);
    return NextResponse.json({ ok: true, data: { url } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: `Couldn't upload that image: ${describeUploadError(error)}` },
      { status: 502 },
    );
  }
}
