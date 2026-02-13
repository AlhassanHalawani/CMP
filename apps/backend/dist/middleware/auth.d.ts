import { Request, Response, NextFunction } from 'express';
import { User } from '../models/user.model';
export interface AuthRequest extends Request {
    user?: User;
    tokenPayload?: any;
}
export declare function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
