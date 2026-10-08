"use server";

import { requireRole } from "@/lib/authz";
import { cloudinary } from "@/lib/cloudinary";
import { env } from "@/lib/env";
import type { ActionResult } from "@/server/actions/auth";

const UPLOAD_FOLDER = "sajdhajlo";

/**
 * Signs a direct browser-to-Cloudinary upload. The file never passes through
 * our server — only this small signature does — so a large video doesn't
 * pay the slow "browser -> our VPS -> Cloudinary" double transfer uploading
 * through a server action was doing before.
 */
export async function getCloudinaryUploadSignatureAction(): Promise<
  ActionResult<{
    signature: string;
    timestamp: number;
    apiKey: string;
    cloudName: string;
    folder: string;
  }>
> {
  await requireRole(["ADMIN"]);

  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: UPLOAD_FOLDER },
    env.CLOUDINARY_API_SECRET,
  );

  return {
    ok: true,
    data: {
      signature,
      timestamp,
      apiKey: env.CLOUDINARY_API_KEY,
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      folder: UPLOAD_FOLDER,
    },
  };
}
