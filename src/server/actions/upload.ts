"use server";

import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { requireRole } from "@/lib/authz";
import type { ActionResult } from "@/server/actions/auth";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB raw upload cap, before compression
const MAX_DIMENSION = 1600; // px, long edge — plenty for a card/hero image

/**
 * Local-disk upload: writes into /public/uploads, served directly by Next.js
 * like any other public asset. This is a dev/demo-friendly stand-in for the
 * Cloudinary/S3 signed-upload flow CLAUDE.md §3 calls for — local files
 * don't survive a typical serverless redeploy (Vercel et al. wipe the
 * filesystem on every deploy/scale-out), so this needs to move to real
 * object storage before production.
 */
export async function uploadImageAction(
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  await requireRole(["ADMIN"]);

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided." };
  if (!file.type.startsWith("image/")) return { ok: false, error: "File must be an image." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "Image is too large (max 10MB)." };

  let compressed: Buffer;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    compressed = await sharp(buffer)
      .rotate() // apply EXIF orientation before resizing, then strip metadata
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      // WebP at a low-ish quality — "as much compression as possible" while
      // staying visually fine for a listing card, not a full-bleed hero.
      .webp({ quality: 60 })
      .toBuffer();
  } catch {
    return { ok: false, error: "Couldn't read that file as an image." };
  }

  const filename = `${crypto.randomUUID()}.webp`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), compressed);

  return { ok: true, data: { url: `/uploads/${filename}` } };
}
