import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function joinClub(req: AuthRequest, res: Response): Promise<void>;
export declare function leaveClub(req: AuthRequest, res: Response): void;
export declare function listMembers(req: AuthRequest, res: Response): void;
export declare function updateMembership(req: AuthRequest, res: Response): Promise<void>;
export declare function getMembership(req: AuthRequest, res: Response): void;
