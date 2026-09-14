"use server";

import { requireRole } from "@/lib/authz";
import {
  BanquetOnboardingInput,
  banquetOnboardingSchema,
  VendorOnboardingInput,
  vendorOnboardingSchema,
} from "@/schemas/onboarding";
import { ActionResult } from "@/server/actions/auth";
import { completeBanquetOnboarding, completeVendorOnboarding } from "@/server/services/onboarding";

export async function completeVendorOnboardingAction(
  input: VendorOnboardingInput,
): Promise<ActionResult<{ slug: string }>> {
  const session = await requireRole(["VENDOR"]);

  const parsed = vendorOnboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await completeVendorOnboarding(session.user.id, parsed.data);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === "CITY_NOT_FOUND"
          ? "That city is no longer available — please pick another."
          : "The selected plan no longer exists.",
    };
  }

  return { ok: true, data: { slug: result.slug } };
}

export async function completeBanquetOnboardingAction(
  input: BanquetOnboardingInput,
): Promise<ActionResult<{ slug: string }>> {
  const session = await requireRole(["BANQUET_OWNER"]);

  const parsed = banquetOnboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await completeBanquetOnboarding(session.user.id, parsed.data);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === "CITY_NOT_FOUND"
          ? "That city is no longer available — please pick another."
          : "The selected plan no longer exists.",
    };
  }

  return { ok: true, data: { slug: result.slug } };
}
