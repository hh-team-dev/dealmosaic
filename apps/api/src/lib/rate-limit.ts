import type { MiddlewareHandler } from 'hono';
import type { AppBindings } from '../middleware/session.js';
import { clientIp, tooMany } from './http.js';

/**
 * In-memory sliding-window limiter.
 *
 * Deliberately simple: one API instance, no Redis, no cost. It is the correct
 * trade-off for launch scale and is documented as needing a shared store
 * (Durable Object / Redis) the moment we run more than one instance.
 */
interface Bucket {
  hits: number[];
}

export function createRateLimiter(opts: {
  windowMs: number;
  max: number;
  name: string;
  keyFn?: (c: Parameters<MiddlewareHandler<AppBindings>>[0]) => string;
}): MiddlewareHandler<AppBindings> {
  const buckets = new Map<string, Bucket>();
  let lastSweep = Date.now();

  const sweep = (now: number) => {
    if (now - lastSweep < 60_000) return;
    lastSweep = now;
    for (const [key, bucket] of buckets) {
      bucket.hits = bucket.hits.filter((t) => now - t < opts.windowMs);
      if (bucket.hits.length === 0) buckets.delete(key);
    }
  };

  return async (c, next) => {
    const now = Date.now();
    sweep(now);
    const key = `${opts.name}:${opts.keyFn ? opts.keyFn(c) : clientIp(c)}`;
    const bucket = buckets.get(key) ?? { hits: [] };
    bucket.hits = bucket.hits.filter((t) => now - t < opts.windowMs);
    if (bucket.hits.length >= opts.max) {
      const oldest = bucket.hits[0] ?? now;
      const retryAfter = Math.max(1, Math.ceil((opts.windowMs - (now - oldest)) / 1000));
      c.header('Retry-After', String(retryAfter));
      buckets.set(key, bucket);
      throw tooMany(`Too many attempts. Try again in ${Math.ceil(retryAfter / 60)} minute(s).`);
    }
    bucket.hits.push(now);
    buckets.set(key, bucket);
    await next();
  };
}

/** Strict limiter for credential endpoints: 10 attempts per 15 minutes per IP. */
export const authLimiter = createRateLimiter({ name: 'auth', windowMs: 15 * 60_000, max: 10 });

/** Generous limiter for everything else: 300 requests per minute per IP. */
export const generalLimiter = createRateLimiter({ name: 'general', windowMs: 60_000, max: 300 });
