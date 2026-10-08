"use server";

import type { UploadApiOptions } from "cloudinary";

import { requireRole } from "@/lib/authz";
import { cloudinary } from "@/lib/cloudinary";
import type { ActionResult } from "@/server/actions/auth";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB raw upload cap
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB — short popup/guide clips only
const UPLOAD_FOLDER = "sajdhajlo";

function uploadBuffer(
  buffer: Buffer,
  options: UploadApiOptions,
): Promise<{ public_id: string; resource_type: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error || !result) {
        reject(error ?? new Error("Cloudinary upload returned no result."));
        return;
      }
      resolve(result);
    });
    stream.end(buffer);
  });
}

/**
 * Uploads via our server using the fully-authenticated SDK (api_key +
 * api_secret, not a client-signed request) and returns a delivery URL with
 * f_auto/q_auto baked in.
 *
 * This proxies the file through our server rather than uploading straight
 * from the browser — slower for a big file, but the direct browser upload
 * this replaced was being rejected ("cloud_name is disabled") by this
 * Cloudinary account's security settings restricting client-side uploads.
 * That's an account-config issue, not something fixable from here — if it
 * gets enabled in the Cloudinary dashboard later, this can go back to a
 * direct upload for faster large-video handling.
 */
export async function uploadImageAction(
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  await requireRole(["ADMIN"]);

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided." };
  if (!file.type.startsWith("image/")) return { ok: false, error: "File must be an image." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "Image is too large (max 10MB)." };

  let result: { public_id: string };
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    result = await uploadBuffer(buffer, { resource_type: "image", folder: UPLOAD_FOLDER });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return { ok: false, error: `Couldn't upload that image: ${message}` };
  }

  const url = cloudinary.url(result.public_id, {
    resource_type: "image",
    secure: true,
    fetch_format: "auto",
    quality: "auto",
    width: 1600,
    crop: "limit",
  });

  return { ok: true, data: { url } };
}

const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm", "video/ogg", "video/quicktime"]);

export async function uploadVideoAction(
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  await requireRole(["ADMIN"]);

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided." };
  if (!VIDEO_MIME_TYPES.has(file.type)) {
    return { ok: false, error: "File must be an MP4, WebM, Ogg, or MOV video." };
  }
  if (file.size > MAX_VIDEO_BYTES) return { ok: false, error: "Video is too large (max 100MB)." };

  let result: { public_id: string };
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    result = await uploadBuffer(buffer, { resource_type: "video", folder: UPLOAD_FOLDER });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return { ok: false, error: `Couldn't upload that video: ${message}` };
  }

  const url = cloudinary.url(result.public_id, {
    resource_type: "video",
    secure: true,
    fetch_format: "auto",
    quality: "auto",
  });

  return { ok: true, data: { url } };
}
