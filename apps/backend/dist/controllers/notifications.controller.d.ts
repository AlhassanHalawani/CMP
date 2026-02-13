import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function list(req: AuthRequest, res: Response): void;
export declare function markRead(req: AuthRequest, res: Response): void;
export declare function markAllRead(req: AuthRequest, res: Response): void;
