import { Request, Response, NextFunction } from 'express';

type WindowConfig = {
  windowMs: number; // per window in ms
  max: number;      // max requests per window
};

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

export function roleRateLimit(opts: Partial<Record<'STUDENT' | 'FACULTY' | 'ADMIN', WindowConfig>>) {
  const defaults: Record<string, WindowConfig> = {
    STUDENT: { windowMs: 60_000, max: 20 },
    FACULTY: { windowMs: 60_000, max: 10 },
    ADMIN: { windowMs: 60_000, max: 30 },
  };
  const conf: Record<string, WindowConfig> = { ...defaults, ...(opts as any) };
  return (req: Request, res: Response, next: NextFunction) => {
    const role = (req as any).user?.role as 'STUDENT' | 'FACULTY' | 'ADMIN' | undefined;
    const keyBase = `${role || 'anon'}:${(req as any).user?.sub || req.ip}`;
    const key = `${keyBase}:${req.path}`;
    const { windowMs, max } = conf[role || 'STUDENT'];
    const now = Date.now();
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
