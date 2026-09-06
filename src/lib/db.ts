import { PrismaClient } from "@prisma/client";

/**
 * Next.js hot-reloads server modules in dev, which would otherwise create a
 * new PrismaClient (and a new connection pool) on every edit. Stash the
 * instance on `globalThis` so dev reuses the same client.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
