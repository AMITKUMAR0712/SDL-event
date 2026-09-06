import { auth } from "@/lib/auth";
import {
  getCustomerUnlockStatus,
  getGuestUnlockQuota,
  hasActiveCustomerSubscription,
} from "@/server/services/unlock";

export type GateContext =
  | { kind: "GUEST" }
  | { kind: "STAFF" } // ADMIN/SUPPORT — always unlocked
  | { kind: "SUBSCRIBED_CUSTOMER"; userId: string }
  | { kind: "QUOTA_CUSTOMER"; userId: string; remaining: number };

/**
 * Resolves what this visitor is entitled to see. Guests have no persistent
 * identity, so their "free quota" (CLAUDE.md: 3 for guests, 5 for signed-in)
 * is enforced positionally on the results page — the first N cards in a
 * given listing render fully unlocked — rather than tracked server-side
 * across visits. Signed-in customers get the real thing: a rolling 30-day
 * UnlockEvent count against their quota, or an unconditional unlock if they
 * hold an active Plus subscription.
 */
export async function getGateContext(): Promise<GateContext> {
  const session = await auth();
  if (!session?.user) return { kind: "GUEST" };
  if (session.user.role === "ADMIN" || session.user.role === "SUPPORT") return { kind: "STAFF" };
  if (session.user.role !== "CUSTOMER") return { kind: "GUEST" };

  const subscribed = await hasActiveCustomerSubscription(session.user.id);
  if (subscribed) return { kind: "SUBSCRIBED_CUSTOMER", userId: session.user.id };

  const status = await getCustomerUnlockStatus(session.user.id);
  return { kind: "QUOTA_CUSTOMER", userId: session.user.id, remaining: status.remaining };
}

/** Free-quota size for cards rendered fully unlocked on a results page. */
export async function freeResultQuota(gate: GateContext): Promise<number> {
  if (gate.kind === "STAFF" || gate.kind === "SUBSCRIBED_CUSTOMER") return Infinity;
  if (gate.kind === "QUOTA_CUSTOMER") return gate.remaining;
  return getGuestUnlockQuota();
}

export function isProfileUnlocked(
  gate: GateContext,
  positionOnPage: number,
  quota: number,
): boolean {
  if (gate.kind === "STAFF" || gate.kind === "SUBSCRIBED_CUSTOMER") return true;
  return positionOnPage < quota;
}
