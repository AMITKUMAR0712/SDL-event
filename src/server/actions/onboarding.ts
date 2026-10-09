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
): Promise<ActionResult<{ slug: string; subscriptionId: string | null }>> {
  const session = await requireRole(["VENDOR"]);

  const parsed = vendorOnboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await completeVendorOnboarding(session.user.id, parsed.data);
  if (!result.ok) {
    return { ok: false, error: onboardingErrorMessage(result.reason) };
  }

  return { ok: true, data: { slug: result.slug, subscriptionId: result.subscriptionId } };
}

function onboardingErrorMessage(
  reason: "PLAN_NOT_FOUND" | "CITY_NOT_FOUND" | "PHONE_TAKEN",
): string {
  switch (reason) {
    case "CITY_NOT_FOUND":
      return "That city is no longer available — please pick another.";
    case "PHONE_TAKEN":
      return "That phone number is already linked to another account.";
    default:
      return "The selected plan no longer exists.";
  }
}

export async function completeBanquetOnboardingAction(
  input: BanquetOnboardingInput,
): Promise<ActionResult<{ slug: string; subscriptionId: string | null }>> {
  const session = await requireRole(["BANQUET_OWNER"]);

  const parsed = banquetOnboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await completeBanquetOnboarding(session.user.id, parsed.data);
  if (!result.ok) {
    return { ok: false, error: onboardingErrorMessage(result.reason) };
  }

  return { ok: true, data: { slug: result.slug, subscriptionId: result.subscriptionId } };
}
