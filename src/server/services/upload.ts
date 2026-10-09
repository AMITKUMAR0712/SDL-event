import type { UploadApiOptions } from "cloudinary";

import { cloudinary } from "@/lib/cloudinary";

const UPLOAD_FOLDER = "sajdhajlo";

// Cloudinary's SDK rejects with a plain { message, http_code, ... } object,
// not a real Error instance, so `error instanceof Error` misses it and
// swallows the actual reason behind a useless "unknown error".
export function describeUploadError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return JSON.stringify(error);
}

function uploadBuffer(buffer: Buffer, options: UploadApiOptions): Promise<{ public_id: string }> {
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

export async function uploadImageToCloudinary(buffer: Buffer): Promise<{ url: string }> {
  const result = await uploadBuffer(buffer, {
    resource_type: "image",
    folder: UPLOAD_FOLDER,
    timeout: 120_000,
  });
  const url = cloudinary.url(result.public_id, {
    resource_type: "image",
    secure: true,
    fetch_format: "auto",
    quality: "auto",
    width: 1600,
    crop: "limit",
  });
  return { url };
}

export async function uploadVideoToCloudinary(buffer: Buffer): Promise<{ url: string }> {
  const result = await uploadBuffer(buffer, {
    resource_type: "video",
    folder: UPLOAD_FOLDER,
    timeout: 120_000,
  });
  const url = cloudinary.url(result.public_id, {
    resource_type: "video",
    secure: true,
    fetch_format: "auto",
    quality: "auto",
  });
  return { url };
}
