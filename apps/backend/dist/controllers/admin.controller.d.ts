import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function getStats(_req: AuthRequest, res: Response): void;
export declare function getAuditLog(req: AuthRequest, res: Response): void;
export declare function listSemesters(_req: AuthRequest, res: Response): void;
export declare function createSemester(req: AuthRequest, res: Response): void;
export declare function setActiveSemester(req: AuthRequest, res: Response): void;
export declare function deleteSemester(req: AuthRequest, res: Response): void;
