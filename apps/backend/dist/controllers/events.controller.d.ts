import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function listEvents(req: Request, res: Response): void;
export declare function getEvent(req: Request, res: Response): void;
export declare function createEvent(req: AuthRequest, res: Response): void;
export declare function updateEvent(req: AuthRequest, res: Response): void;
export declare function deleteEvent(req: AuthRequest, res: Response): void;
export declare function registerForEvent(req: AuthRequest, res: Response): void;
export declare function cancelRegistration(req: AuthRequest, res: Response): void;
