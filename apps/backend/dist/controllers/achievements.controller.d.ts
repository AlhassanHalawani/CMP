import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function listForUser(req: Request, res: Response): void;
export declare function listForClub(req: Request, res: Response): void;
export declare function create(req: AuthRequest, res: Response): void;
export declare function remove(req: AuthRequest, res: Response): void;
export declare function downloadReport(req: Request, res: Response): Promise<void>;
