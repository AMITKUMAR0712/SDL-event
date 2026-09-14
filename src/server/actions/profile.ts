"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/authz";
import {
  BanquetProfileEditInput,
  banquetProfileEditSchema,
  VendorProfileEditInput,
  vendorProfileEditSchema,
} from "@/schemas/profile";
import { ActionResult } from "@/server/actions/auth";
import { updateBanquetProfile, updateVendorProfile } from "@/server/services/profile";

export async function updateVendorProfileAction(
  input: VendorProfileEditInput,
): Promise<ActionResult> {
  const session = await requireRole(["VENDOR"]);

  const parsed = vendorProfileEditSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await updateVendorProfile(session.user.id, parsed.data);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === "CITY_NOT_FOUND"
          ? "That city is no longer available — please pick another."
          : "Profile not found — finish onboarding first.",
    };
  }

  revalidatePath("/dashboard/vendor");
  revalidatePath("/dashboard/vendor/profile");
  return { ok: true, data: undefined };
}

export async function updateBanquetProfileAction(
  input: BanquetProfileEditInput,
): Promise<ActionResult> {
  const session = await requireRole(["BANQUET_OWNER"]);

  const parsed = banquetProfileEditSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await updateBanquetProfile(session.user.id, parsed.data);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === "CITY_NOT_FOUND"
          ? "That city is no longer available — please pick another."
          : "Profile not found — finish onboarding first.",
    };
  }

  revalidatePath("/dashboard/banquet");
  revalidatePath("/dashboard/banquet/profile");
  return { ok: true, data: undefined };
}
