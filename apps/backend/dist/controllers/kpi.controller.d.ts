import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function recordMetric(req: AuthRequest, res: Response): void;
export declare function getClubSummary(req: Request, res: Response): void;
export declare function getLeaderboard(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function computeKpi(req: AuthRequest, res: Response): void;
