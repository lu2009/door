import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { verifyToken } from '../utils/jwt';

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ code: 401, message: '未授权' });
    return;
  }
  try {
    const payload = verifyToken(authHeader.slice(7));
    req.user = {
      username: payload.sub,
      databaseName: payload.ds,
      displayName: payload.name,
      registrant: payload.registrant,
    };
    next();
  } catch {
    res.status(401).json({ code: 401, message: '无效的认证令牌' });
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const payload = verifyToken(authHeader.slice(7));
      req.user = {
        username: payload.sub,
        databaseName: payload.ds,
        displayName: payload.name,
        registrant: payload.registrant,
      };
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }
  next();
}
