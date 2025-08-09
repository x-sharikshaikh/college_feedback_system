import { Request, Response, NextFunction } from 'express';
import { createClient, RedisClientType } from 'redis';
import { config } from '@config/env';

type WindowConfig = {
  windowMs: number; // per window in ms
  max: number;      // max requests per window
};

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();
let redis: RedisClientType | null = null;
let redisReady = false;

async function getRedis(): Promise<RedisClientType | null> {
  // Skip Redis in test environment to prevent connection leaks during Jest
  if (config.nodeEnv === 'test') return null;
  if (!config.redisUrl) return null;
  if (redis) return redisReady ? redis : null;
  try {
    redis = createClient({ url: config.redisUrl });
    redis.on('error', () => { redisReady = false; });
    redis.on('ready', () => { redisReady = true; });
    await redis.connect();
    redisReady = true;
    return redis;
  } catch {
    redisReady = false;
    return null;
  }
}

// Best-effort graceful shutdown for Redis client
const closeRedis = async () => { try { await redis?.quit(); } catch { /* noop */ } };
process.once('SIGINT', () => { void closeRedis(); });
process.once('SIGTERM', () => { void closeRedis(); });

export function roleRateLimit(opts: Partial<Record<'STUDENT' | 'FACULTY' | 'ADMIN', WindowConfig>>) {
  const defaults: Record<string, WindowConfig> = {
    STUDENT: { windowMs: 60_000, max: 20 },
    FACULTY: { windowMs: 60_000, max: 10 },
    ADMIN: { windowMs: 60_000, max: 30 },
  };
  const conf: Record<string, WindowConfig> = { ...defaults, ...(opts as any) };
  return async (req: Request, res: Response, next: NextFunction) => {
    const role = (req as any).user?.role as 'STUDENT' | 'FACULTY' | 'ADMIN' | undefined;
    const keyBase = `${role || 'anon'}:${(req as any).user?.sub || req.ip}`;
    const key = `${keyBase}:${req.path}`;
    const { windowMs, max } = conf[role || 'STUDENT'];
    const now = Date.now();
    const r = await getRedis();
    if (r) {
      try {
        const ttlKey = `ratelimit:ttl:${key}`;
        const countKey = `ratelimit:count:${key}`;
  const ttl = await r.pTTL(ttlKey);
        if (ttl <= 0) {
          // new window
          await r.multi()
            .set(countKey, '1', { PX: windowMs })
            .set(ttlKey, '1', { PX: windowMs })
            .exec();
          return next();
        }
        const cnt = await r.incr(countKey);
        if (cnt === 1) {
          await r.pExpire(countKey, windowMs);
        }
        if (cnt > max) {
          const retryAfter = Math.max(0, Math.ceil(ttl / 1000));
          res.setHeader('Retry-After', String(retryAfter));
          return res.status(429).json({ error: 'Too many requests' });
        }
        return next();
      } catch {
        // fallthrough to memory on any redis error
      }
    }
    // memory fallback
    const bucket = memoryBuckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (bucket.count >= max) {
      const retryAfter = Math.max(0, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Too many requests' });
    }
    bucket.count += 1;
    return next();
  };
}
