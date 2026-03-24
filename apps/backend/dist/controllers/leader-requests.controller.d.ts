import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
/** POST /api/leader-requests — student submits a request */
export declare function createLeaderRequest(req: AuthRequest, res: Response): Promise<void>;
/** GET /api/leader-requests — admin lists all requests */
export declare function listLeaderRequests(req: AuthRequest, res: Response): void;
/** GET /api/leader-requests/mine — current user's own requests */
export declare function listMyLeaderRequests(req: AuthRequest, res: Response): void;
/** PATCH /api/leader-requests/:id/approve — admin approves */
export declare function approveLeaderRequest(req: AuthRequest, res: Response): Promise<void>;
/** PATCH /api/leader-requests/:id/reject — admin rejects */
export declare function rejectLeaderRequest(req: AuthRequest, res: Response): Promise<void>;
