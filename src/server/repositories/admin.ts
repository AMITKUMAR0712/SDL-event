import { db } from "@/lib/db";

export async function getDashboardMetrics() {
  const [
    totalUsers,
    activeVendorSubs,
    activeBanquetSubs,
    activeCustomerSubs,
    totalBookings,
    completedBookings,
    pendingVendorKyc,
    pendingBanquetKyc,
    gmv,
  ] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.subscription.count({ where: { status: "ACTIVE", plan: { audience: "VENDOR" } } }),
    db.subscription.count({ where: { status: "ACTIVE", plan: { audience: "BANQUET" } } }),
    db.subscription.count({ where: { status: "ACTIVE", plan: { audience: "CUSTOMER" } } }),
    db.booking.count(),
    db.booking.count({ where: { status: "COMPLETED" } }),
    db.vendorProfile.count({ where: { kycStatus: "PENDING" } }),
    db.banquetProfile.count({ where: { kycStatus: "PENDING" } }),
    db.booking.aggregate({ where: { status: "COMPLETED" }, _sum: { totalPaise: true } }),
  ]);

  return {
    totalUsers,
    activeVendorSubs,
    activeBanquetSubs,
    activeCustomerSubs,
    totalBookings,
    completedBookings,
    pendingVendorKyc,
    pendingBanquetKyc,
    gmvPaise: gmv._sum.totalPaise ?? 0,
  };
}

export function listPendingVendorKyc() {
  return db.vendorProfile.findMany({
    where: { kycStatus: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true, email: true, phone: true } }, city: true },
  });
}

export function listPendingBanquetKyc() {
  return db.banquetProfile.findMany({
    where: { kycStatus: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true, email: true, phone: true } }, city: true },
  });
}

export function listUsers(cursor?: string, take = 50) {
  return db.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });
}

export function listAllBookings(cursor?: string, take = 50) {
  return db.booking.findMany({
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: { customer: { select: { name: true, email: true } } },
  });
}

export function listAllCoupons() {
  return db.coupon.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
}

export function listAuditLog(cursor?: string, take = 50) {
  return db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: { actor: { select: { name: true, email: true } } },
  });
}

export function listAllSettings() {
  return db.setting.findMany({ orderBy: { key: "asc" } });
}
