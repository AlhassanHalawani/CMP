import { Request, Response } from 'express';
import multer from 'multer';
import { AuthRequest } from '../middleware/auth';
export declare const logoUpload: multer.Multer;
export declare function listClubs(req: Request, res: Response): void;
export declare function getClub(req: Request, res: Response): void;
export declare function createClub(req: AuthRequest, res: Response): void;
export declare function updateClub(req: AuthRequest, res: Response): void;
export declare function deleteClub(req: AuthRequest, res: Response): void;
export declare function getClubStats(req: Request, res: Response): void;
/**
 * POST /api/clubs/:id/assign-leader  (admin only)
 * Body: { user_id: number }
 * Atomically:
 *   1. Sets club.leader_id = user_id
 *   2. Promotes the new user to club_leader role
 *   3. Demotes the previous leader back to student if they no longer lead any club
 */
export declare function assignClubLeader(req: AuthRequest, res: Response): void;
export declare function getClubDashboard(req: AuthRequest, res: Response): void;
export declare function uploadLogo(req: AuthRequest, res: Response): void;
