import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function getMyPreferences(req: AuthRequest, res: Response): void;
export declare function updateMyPreferences(req: AuthRequest, res: Response): void;
