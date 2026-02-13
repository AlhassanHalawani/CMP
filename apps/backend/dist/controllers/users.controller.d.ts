import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function getMe(req: AuthRequest, res: Response): void;
export declare function updateMe(req: AuthRequest, res: Response): void;
export declare function listUsers(req: AuthRequest, res: Response): void;
export declare function updateUserRole(req: AuthRequest, res: Response): void;
