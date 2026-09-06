import { db } from "@/lib/db";

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

export function createUserWithPassword(input: {
  name: string;
  email: string;
  passwordHash: string;
  role: "CUSTOMER" | "VENDOR" | "BANQUET_OWNER";
}) {
  return db.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
    },
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
