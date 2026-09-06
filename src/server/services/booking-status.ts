export type BookingStatus =
  "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | "REFUNDED";

export type BookingActor = "CUSTOMER" | "OWNER" | "ADMIN";

/**
 * Allowed (from, to, actor) transitions. Centralized here per CLAUDE.md §4:
 * "status machine with allowed transitions per role, enforced in one place."
 * ADMIN can additionally force any transition — checked separately in
 * canTransition() rather than duplicated into every row below.
 */
const TRANSITIONS: { from: BookingStatus; to: BookingStatus; actors: BookingActor[] }[] = [
  { from: "PENDING", to: "CONFIRMED", actors: ["OWNER"] },
  { from: "PENDING", to: "CANCELLED", actors: ["CUSTOMER", "OWNER"] },
  { from: "CONFIRMED", to: "IN_PROGRESS", actors: ["OWNER"] },
  { from: "CONFIRMED", to: "CANCELLED", actors: ["CUSTOMER", "OWNER"] },
  { from: "CONFIRMED", to: "NO_SHOW", actors: ["OWNER"] },
  { from: "IN_PROGRESS", to: "COMPLETED", actors: ["OWNER"] },
  { from: "IN_PROGRESS", to: "NO_SHOW", actors: ["OWNER"] },
  { from: "COMPLETED", to: "REFUNDED", actors: ["ADMIN"] },
  { from: "CANCELLED", to: "REFUNDED", actors: ["ADMIN"] },
];

export function canTransition(
  from: BookingStatus,
  to: BookingStatus,
  actor: BookingActor,
): boolean {
  if (actor === "ADMIN") return from !== to;
  return TRANSITIONS.some((t) => t.from === from && t.to === to && t.actors.includes(actor));
}

export function allowedNextStatuses(from: BookingStatus, actor: BookingActor): BookingStatus[] {
  return TRANSITIONS.filter((t) => t.from === from && t.actors.includes(actor)).map((t) => t.to);
}

export type CancellationPolicy = {
  fullRefundBeforeHours: number;
  partialRefundPercent: number;
  partialRefundBeforeHours: number;
};

/** Refund percentage (0-100) for cancelling a booking scheduled at `scheduledAt`, cancelled now. */
export function refundPercentFor(scheduledAt: Date, now: Date, policy: CancellationPolicy): number {
  const hoursUntil = (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntil >= policy.fullRefundBeforeHours) return 100;
  if (hoursUntil >= policy.partialRefundBeforeHours) return policy.partialRefundPercent;
  return 0;
}
