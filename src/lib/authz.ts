import { auth } from "@/lib/auth";

export class UnauthorizedError extends Error {
  constructor(message = "You must be signed in.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Every server action that mutates data calls this first — it is the second
 * of the two required authorisation checks from CLAUDE.md §4.4 (the first
 * being proxy.ts's route-level guard, which only covers page navigation, not
 * server actions/route handlers invoked directly).
 */
export async function requireRole(allowedRoles: string[]) {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  if (!allowedRoles.includes(session.user.role)) {
    throw new ForbiddenError();
  }
  return session;
}

/**
 * Ownership check: the signed-in user's vendorId/banquetId (or user id, for
 * customer-owned resources) must match the resource's owner id. ADMIN and
 * SUPPORT bypass ownership entirely.
 */
export async function requireOwnership(resourceOwnerId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError();
  }

  const { role, id, vendorId, banquetId } = session.user;
  const isAdmin = role === "ADMIN" || role === "SUPPORT";
  const owns = [id, vendorId, banquetId].includes(resourceOwnerId);

  if (!isAdmin && !owns) {
    throw new ForbiddenError();
  }

  return session;
}
