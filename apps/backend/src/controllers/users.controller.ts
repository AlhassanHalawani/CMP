import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { UserModel } from '../models/user.model';
import { logAction } from '../services/audit.service';
import { syncUserRealmRole } from '../services/keycloakAdmin.service';
import { logger } from '../utils/logger';

export function getMe(req: AuthRequest, res: Response) {
  res.json(req.user);
}

export function updateMe(req: AuthRequest, res: Response) {
  const { name, avatar_url } = req.body;
  UserModel.updateProfile(req.user!.id, { name, avatar_url });
  const updated = UserModel.findById(req.user!.id);
  res.json(updated);
}

export function listUsers(req: AuthRequest, res: Response) {
  const role = req.query.role as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const users = UserModel.list({ role, limit, offset });
  const total = UserModel.count();
  res.json({ data: users, total });
}

export async function updateUserRole(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const { role } = req.body;
  const user = UserModel.findById(id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const previousRole = user.role;
  UserModel.updateRole(id, role);
  logAction({ actorId: req.user!.id, action: 'update_role', entityType: 'user', entityId: id, payload: { role } });

  // Sync to Keycloak so the next token refresh reflects the new role.
  // Best-effort: a sync failure does not roll back the DB change.
  syncUserRealmRole(user.keycloak_id, role, previousRole).catch((err: Error) => {
    logger.warn(`Keycloak role sync failed for user ${id}: ${err.message}`);
  });

  res.json(UserModel.findById(id));
}
