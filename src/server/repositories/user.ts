import { db } from "@/lib/db";
import {
  BANQUET_ACCOUNT_COUNT_BASELINE,
  BANQUET_ACCOUNT_COUNT_KEY,
  VENDOR_ACCOUNT_COUNT_BASELINE,
  VENDOR_ACCOUNT_COUNT_KEY,
} from "@/lib/marketplace-stats";

export function findUserByEmail(email: string) {
  return db.user.findUnique({ where: { email } });
}

export function findUserByPhone(phone: string) {
  return db.user.findUnique({ where: { phone } });
}

export function findUserById(id: string) {
  return db.user.findUnique({ where: { id } });
}

export function createCustomerWithPhone(phone: string, name?: string) {
  return db.user.create({
    data: { phone, name, role: "CUSTOMER", phoneVerifiedAt: new Date() },
  });
}

/** Guest checkout: the phone number typed into a booking form hasn't been
 * through an OTP step, so — unlike createCustomerWithPhone, used after a
 * real OTP verification — this must NOT set phoneVerifiedAt. */
export function createGuestCustomerWithPhone(phone: string) {
  return db.user.create({ data: { phone, role: "CUSTOMER" } });
}

export function createUserWithPassword(input: {
  name: string;
  email: string;
  passwordHash: string;
  role: "CUSTOMER" | "VENDOR" | "BANQUET_OWNER";
}) {
  return db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role,
      },
    });

    if (input.role === "VENDOR" || input.role === "BANQUET_OWNER") {
      const counter =
        input.role === "VENDOR"
          ? { key: VENDOR_ACCOUNT_COUNT_KEY, baseline: VENDOR_ACCOUNT_COUNT_BASELINE }
          : { key: BANQUET_ACCOUNT_COUNT_KEY, baseline: BANQUET_ACCOUNT_COUNT_BASELINE };

      await tx.$executeRaw`
        INSERT INTO \`Setting\` (\`key\`, \`value\`, \`updatedAt\`)
        VALUES (${counter.key}, JSON_OBJECT('count', ${counter.baseline + 1}), CURRENT_TIMESTAMP(3))
        ON DUPLICATE KEY UPDATE
          \`value\` = JSON_SET(
            \`value\`,
            '$.count',
            CAST(
              COALESCE(
                JSON_UNQUOTE(JSON_EXTRACT(\`value\`, '$.count')),
                ${counter.baseline}
              ) AS UNSIGNED
            ) + 1
          ),
          \`updatedAt\` = CURRENT_TIMESTAMP(3)
      `;
    }

    return user;
  });
}

export function recordFailedLogin(userId: string, lockThreshold: number, lockMinutes: number) {
  return db.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { failedLoginCount: { increment: 1 } },
    });

    if (user.failedLoginCount >= lockThreshold) {
      return tx.user.update({
        where: { id: userId },
        data: { lockedUntil: new Date(Date.now() + lockMinutes * 60_000) },
      });
    }

    return user;
  });
}

export function resetFailedLogins(userId: string) {
  return db.user.update({
    where: { id: userId },
    data: { failedLoginCount: 0, lockedUntil: null },
  });
}

export function setPasswordHash(userId: string, passwordHash: string) {
  return db.user.update({
    where: { id: userId },
    data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
  });
}

export function markEmailVerified(userId: string) {
  return db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
}

export function getActiveSubscriptionSummary(userId: string) {
  return db.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { currentPeriodEnd: "desc" },
    select: { id: true, planId: true, plan: { select: { code: true, audience: true } } },
  });
}

export function getVendorAndBanquetIds(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: { vendorProfile: { select: { id: true } }, banquetProfile: { select: { id: true } } },
  });
}
