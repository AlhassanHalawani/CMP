import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { User } from '../models/user.model';

export function requireRole(...roles: User['role'][]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
