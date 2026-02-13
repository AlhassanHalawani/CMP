import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { User } from '../models/user.model';
export declare function requireRole(...roles: User['role'][]): (req: AuthRequest, res: Response, next: NextFunction) => void;
