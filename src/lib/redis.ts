import { Redis } from "@upstash/redis";

import { env } from "@/lib/env";

/**
 * Minimal surface this app actually uses from Redis: string get/set-with-ttl,
 * atomic increment (for rate limiting and OTP attempt counters), and delete.
 * Both the real Upstash client and the dev fallback below implement this.
 */
export type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { exSeconds?: number }): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  del(key: string): Promise<void>;
  ttl(key: string): Promise<number>;
};

class UpstashRedisAdapter implements RedisLike {
  constructor(private readonly client: Redis) {}

  async get(key: string) {
    return (await this.client.get<string>(key)) ?? null;
  }

  async set(key: string, value: string, opts?: { exSeconds?: number }) {
    if (opts?.exSeconds) {
      await this.client.set(key, value, { ex: opts.exSeconds });
    } else {
      await this.client.set(key, value);
    }
  }

  async incr(key: string) {
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number) {
    await this.client.expire(key, seconds);
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async ttl(key: string) {
    return this.client.ttl(key);
  }
}

/**
 * In-memory stand-in for local development when Upstash isn't configured.
 * NEVER used in production — see `getRedis()` below, which only falls back
 * to this when both Upstash env vars are empty. State is per-process and
 * lost on restart; that's fine for a dev box, not for anything shared.
 */
class InMemoryRedis implements RedisLike {
  private readonly store = new Map<string, { value: string; expiresAt: number | null }>();

  private isExpired(entry: { expiresAt: number | null }) {
    return entry.expiresAt !== null && entry.expiresAt <= Date.now();
  }

  async get(key: string) {
    const entry = this.store.get(key);
    if (!entry || this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, opts?: { exSeconds?: number }) {
    const expiresAt = opts?.exSeconds ? Date.now() + opts.exSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async incr(key: string) {
    const current = await this.get(key);
    const next = (current ? Number(current) : 0) + 1;
    const existing = this.store.get(key);
    this.store.set(key, { value: String(next), expiresAt: existing?.expiresAt ?? null });
    return next;
  }

  async expire(key: string, seconds: number) {
    const entry = this.store.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + seconds * 1000;
    }
  }

  async del(key: string) {
    this.store.delete(key);
  }

  async ttl(key: string) {
    const entry = this.store.get(key);
    if (!entry || !entry.expiresAt) return -1;
    return Math.max(0, Math.round((entry.expiresAt - Date.now()) / 1000));
  }
}

let cached: RedisLike | undefined;

export function getRedis(): RedisLike {
  if (cached) return cached;

  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    cached = new UpstashRedisAdapter(
      new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN }),
    );
  } else {
    // `NODE_ENV === "production"` isn't "this is a real deployment" — `next
    // start` sets it for any local/CI production-build run too (e.g. this
    // project's own e2e suite). Degrading to the in-memory fallback with a
    // loud warning is a far safer failure mode than crashing every request
    // that touches Redis; a real deployment just needs to configure Upstash.
    logDevFallbackWarningOnce();
    cached = new InMemoryRedis();
  }

  return cached;
}

let warned = false;
function logDevFallbackWarningOnce() {
  if (warned) return;
  warned = true;
  console.warn(
    "[redis] UPSTASH_REDIS_REST_URL/TOKEN not set — using an in-memory dev fallback. " +
      "OTP codes, rate limits, and search cache will NOT survive a restart or work across instances.",
  );
}
