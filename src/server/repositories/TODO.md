# server/repositories

All Prisma access lives here and nowhere else. Services call repositories; components never
import Prisma.
