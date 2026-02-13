import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function listClubs(req: Request, res: Response): void;
export declare function getClub(req: Request, res: Response): void;
export declare function createClub(req: AuthRequest, res: Response): void;
export declare function updateClub(req: AuthRequest, res: Response): void;
export declare function deleteClub(req: AuthRequest, res: Response): void;
