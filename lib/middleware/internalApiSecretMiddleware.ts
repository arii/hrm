// lib/middleware/internalApiSecretMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { env } from '@/lib/env';

export function internalApiSecretMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const secret = req.headers['x-internal-api-secret'];
  if (secret === env.INTERNAL_API_SECRET) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
