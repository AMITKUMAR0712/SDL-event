import { getRedis } from "@/lib/redis";

const TTL_SECONDS = 30 * 60;

function key(bookingId: string) {
  return `service-start-otp:${bookingId}`;
}

/**
 * Generates a code the customer reads aloud to the professional at an
 * at-home visit to confirm service start (CLAUDE.md Phase 4). Shown to the
 * customer in-app on their booking page — no SMS delivery needed since
 * they're already present with the professional.
 */
export async function generateServiceStartOtp(bookingId: string): Promise<string> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await getRedis().set(key(bookingId), code, { exSeconds: TTL_SECONDS });
  return code;
}

export async function verifyServiceStartOtp(bookingId: string, code: string): Promise<boolean> {
  const stored = await getRedis().get(key(bookingId));
  if (!stored || stored !== code) return false;
  await getRedis().del(key(bookingId));
  return true;
}
