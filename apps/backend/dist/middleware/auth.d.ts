import { Request, Response, NextFunction } from 'express';
import { User } from '../models/user.model';
export interface AuthRequest extends Request {
    user?: User;
    tokenPayload?: any;
}
/**
 * Optional authentication middleware.
 * - No token → continues as anonymous (req.user is unset)
 * - Valid token → populates req.user and continues
 * - Invalid token → returns 401
 */
export declare function authenticateOptional(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
