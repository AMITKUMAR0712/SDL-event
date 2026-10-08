import { getCloudinaryUploadSignatureAction } from "@/server/actions/upload";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB — short popup/guide clips only

type UploadResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Uploads straight from the browser to Cloudinary using a short-lived signed
 * request — the server only hands out the signature (see
 * getCloudinaryUploadSignatureAction), the file bytes never touch our
 * server. Returns a delivery URL with f_auto/q_auto baked in.
 */
export async function uploadToCloudinary(
  file: File,
  resourceType: "image" | "video",
): Promise<UploadResult> {
  const maxBytes = resourceType === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > maxBytes) {
    return { ok: false, error: `File is too large (max ${Math.round(maxBytes / 1024 / 1024)}MB).` };
  }

  const sig = await getCloudinaryUploadSignatureAction();
  if (!sig.ok) return { ok: false, error: sig.error };

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", sig.data.apiKey);
  formData.append("timestamp", String(sig.data.timestamp));
  formData.append("signature", sig.data.signature);
  formData.append("folder", sig.data.folder);

  let response: Response;
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${sig.data.cloudName}/${resourceType}/upload`,
      { method: "POST", body: formData },
    );
  } catch {
    return { ok: false, error: "Upload failed — check your connection and try again." };
  }

  if (!response.ok) {
    let message = `status ${response.status}`;
    try {
      const body: { error?: { message?: string } } = await response.json();
      if (body.error?.message) message = body.error.message;
    } catch {
      // response body wasn't JSON — fall back to the bare status
    }
    return { ok: false, error: `Upload failed: ${message}` };
  }

  const data: { public_id: string } = await response.json();
  const transform = resourceType === "image" ? "f_auto,q_auto,w_1600,c_limit" : "f_auto,q_auto";
  const url = `https://res.cloudinary.com/${sig.data.cloudName}/${resourceType}/upload/${transform}/${data.public_id}`;

  return { ok: true, url };
}
