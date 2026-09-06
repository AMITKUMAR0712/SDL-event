import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

type SecurityEventInput = {
  actorId?: string;
  action:
    | "auth.login_success"
    | "auth.login_failed"
    | "auth.account_locked"
    | "auth.password_reset_requested"
    | "auth.password_reset_completed"
    | "auth.otp_requested"
    | "auth.otp_verified"
    | "auth.otp_failed"
    | "auth.email_verified"
    | "auth.registered";
  entityId: string;
  ip?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
};

/**
 * Every auth-relevant event goes through here into AuditLog — this is the
 * "security-events audit trail" from CLAUDE.md, reusing the generic admin
 * audit log table rather than a bespoke one (see docs/CHANGELOG.md Phase 2).
 */
export function logSecurityEvent(input: SecurityEventInput) {
  return db.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: "User",
      entityId: input.entityId,
      after: (input.meta ?? {}) as Prisma.InputJsonValue,
      ip: input.ip,
      userAgent: input.userAgent,
    },
  });
}
