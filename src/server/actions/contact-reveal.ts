"use server";

import { db } from "@/lib/db";
import { getGateContext } from "@/lib/gate";
import type { ActionResult } from "@/server/actions/auth";
import { revealContact } from "@/server/services/contact-reveal";

export async function revealContactAction(
  targetType: "VENDOR" | "BANQUET",
  targetId: string,
): Promise<ActionResult<{ phone: string | null }>> {
  const gate = await getGateContext();
  const result = await revealContact(gate, targetType, targetId);

  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === "SIGN_IN_REQUIRED"
          ? "Sign in to view contact details."
          : "You've used all your free unlocks this month — upgrade to SajDhajLo Plus for unlimited access.",
    };
  }

  const owner =
    targetType === "VENDOR"
      ? await db.vendorProfile.findUnique({ where: { id: targetId }, select: { userId: true } })
      : await db.banquetProfile.findUnique({ where: { id: targetId }, select: { userId: true } });
  const user = owner
    ? await db.user.findUnique({ where: { id: owner.userId }, select: { phone: true } })
    : null;

  await db.lead.create({
    data: {
      customerId: gate.kind !== "GUEST" && gate.kind !== "STAFF" ? gate.userId : undefined,
      ownerType: targetType,
      ownerId: targetId,
      source: "profile_view",
      phoneRevealed: true,
    },
  });

  return { ok: true, data: { phone: user?.phone ?? null } };
}
