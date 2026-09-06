import { getRedis } from "@/lib/redis";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
};

/**
 * Fixed-window rate limiter: at most `limit` calls per `windowSeconds` for a
 * given key. Good enough for auth/OTP/search endpoints — doesn't need the
 * precision of a sliding window, just needs to stop abuse cheaply.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const redis = getRedis();
  const bucketKey = `ratelimit:${key}`;

  const count = await redis.incr(bucketKey);
  if (count === 1) {
    await redis.expire(bucketKey, windowSeconds);
  }

  const ttl = await redis.ttl(bucketKey);
  const resetInSeconds = ttl > 0 ? ttl : windowSeconds;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetInSeconds,
  };
}
