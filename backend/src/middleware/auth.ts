import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@config/env';

export interface AuthPayload {
  sub: string;
  role: 'STUDENT' | 'FACULTY' | 'ADMIN';
}

export function requireAuth(roles?: AuthPayload['role'][]){
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = header.substring(7);
    try {
      const payload = jwt.verify(token, config.jwtSecret) as AuthPayload;
      (req as any).user = payload;
      if (roles && roles.length && !roles.includes(payload.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      return next();
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
}
