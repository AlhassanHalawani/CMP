import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function getCatalog(_req: AuthRequest, res: Response): void;
export declare function getMyBadges(req: AuthRequest, res: Response): void;
export declare function getMyProgress(req: AuthRequest, res: Response): void;
export declare function patchFeaturedBadge(req: AuthRequest, res: Response): void;
