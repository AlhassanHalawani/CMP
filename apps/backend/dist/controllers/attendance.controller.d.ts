import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function generateEventQr(req: AuthRequest, res: Response): Promise<void>;
export declare function checkIn(req: AuthRequest, res: Response): void;
export declare function manualCheckIn(req: AuthRequest, res: Response): void;
export declare function getAttendanceList(req: AuthRequest, res: Response): void;
