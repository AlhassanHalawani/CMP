import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function recordPageView(req: Request, res: Response): void;
export declare function getTraffic(req: AuthRequest, res: Response): void;
