import "server-only";

import { GateContext } from "@/lib/gate";
import {
  getCustomerUnlockStatus,
  hasActiveCustomerSubscription,
  recordUnlock,
} from "@/server/services/unlock";

export type ContactRevealResult =
  { ok: true } | { ok: false; reason: "QUOTA_EXCEEDED" | "SIGN_IN_REQUIRED" };

/**
 * Called when a signed-in customer wants a single profile's contact info
 * unlocked outside of the results-page positional teaser (i.e. they landed
 * on the profile directly, e.g. from a search engine). Consumes one unit of
 * their rolling monthly quota unless they hold an active subscription.
 */
export async function revealContact(
  gate: GateContext,
  targetType: "VENDOR" | "BANQUET",
  targetId: string,
): Promise<ContactRevealResult> {
  if (gate.kind === "GUEST") return { ok: false, reason: "SIGN_IN_REQUIRED" };
  if (gate.kind === "STAFF" || gate.kind === "SUBSCRIBED_CUSTOMER") return { ok: true };

  const status = await getCustomerUnlockStatus(gate.userId);
  if (!status.withinQuota) return { ok: false, reason: "QUOTA_EXCEEDED" };

  const subscribed = await hasActiveCustomerSubscription(gate.userId);
  await recordUnlock(gate.userId, targetType, targetId, subscribed ? "SUBSCRIPTION" : "FREE_QUOTA");
  return { ok: true };
}
