import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { UserModel } from '../models/user.model';
import { logAction } from '../services/audit.service';
import { syncUserRealmRole, deleteKeycloakUser } from '../services/keycloakAdmin.service';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import { evaluateStudentAchievements } from '../services/achievement-engine.service';
import { awardXp, getLevelProgress } from '../services/gamification.service';
import { notify } from '../services/notifications.service';

export function getMe(req: AuthRequest, res: Response) {
  res.json(req.user);
}

export function recordLoginActivity(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const today = new Date().toISOString().slice(0, 10);

  const insertResult = db
    .prepare(`INSERT OR IGNORE INTO user_login_activity (user_id, login_date) VALUES (?, ?)`)
    .run(userId, today);

  const newUnlocks = evaluateStudentAchievements(userId);

  let xpResult = null;
  if (insertResult.changes > 0) {
    // New login day — award XP once
    xpResult = awardXp({
      userId,
      actionKey: 'daily_login',
      referenceKey: `login:${userId}:${today}`,
    });

    if (xpResult?.level_up) {
      notify({
        userId,
        eventType: 'level_up',
        title: 'Level Up!',
        body: `You reached Level ${xpResult.new_level}. Keep it up!`,
        type: 'success',
        targetUrl: '/profile',
      }).catch(() => { /* best-effort */ });
    }
  }

  res.json({
    date: today,
    xp_awarded: xpResult?.xp_awarded ?? 0,
    new_unlocks: newUnlocks,
    level_up: xpResult?.level_up ?? false,
    new_level: xpResult?.new_level ?? null,
    gamification: xpResult?.progress ?? null,
  });
}

export function updateMe(req: AuthRequest, res: Response) {
  const { name, avatar_url } = req.body;
  const userId = req.user!.id;

  UserModel.updateProfile(userId, { name, avatar_url });
  const updated = UserModel.findById(userId)!;

  // Award profile-completion XP once if the profile is now complete for the first time
  if (!updated.profile_completed_at && updated.name && updated.avatar_url) {
    db.prepare(`UPDATE users SET profile_completed_at = datetime('now') WHERE id = ?`).run(userId);
    const xpResult = awardXp({
      userId,
      actionKey: 'profile_completed',
      referenceKey: `profile:${userId}`,
      sourceType: 'user',
      sourceId: userId,
    });
    if (xpResult?.level_up) {
      notify({
        userId,
        eventType: 'level_up',
        title: 'Level Up!',
        body: `You reached Level ${xpResult.new_level}. Keep it up!`,
        type: 'success',
        targetUrl: '/profile',
      }).catch(() => { /* best-effort */ });
    }
  }

  res.json(UserModel.findById(userId));
}

export function getGamification(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const user = UserModel.findById(userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const progress = getLevelProgress(user.xp_total);

  const recentActions = db
    .prepare(
      `SELECT action_key, xp_delta, source_type, source_id, created_at
       FROM xp_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 10`
    )
    .all(userId);

  res.json({ ...progress, recent_actions: recentActions });
}

export function getXpHistory(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

  const rows = db
    .prepare(
      `SELECT action_key, xp_delta, source_type, source_id, reference_key, created_at
       FROM xp_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(userId, limit);

  res.json({ data: rows, total: (db.prepare('SELECT COUNT(*) as c FROM xp_transactions WHERE user_id = ?').get(userId) as any).c });
}

export function listUsers(req: AuthRequest, res: Response) {
  const role = req.query.role as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const users = UserModel.list({ role, limit, offset });
  const total = UserModel.count();
  res.json({ data: users, total });
}

export async function deleteMe(req: AuthRequest, res: Response) {
  const user = req.user!;

  if (user.role === 'admin' && UserModel.countByRole('admin') <= 1) {
    res.status(400).json({ error: 'Cannot delete the only admin account.' });
    return;
  }

  UserModel.deleteById(user.id);
  logAction({ actorId: user.id, action: 'delete_account', entityType: 'user', entityId: user.id, payload: {} });

  deleteKeycloakUser(user.keycloak_id).catch((err: Error) => {
    logger.warn(`Keycloak user deletion failed for ${user.id}: ${err.message}`);
  });

  res.status(204).send();
}

export async function deleteUser(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const target = UserModel.findById(id);
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (target.role === 'admin' && UserModel.countByRole('admin') <= 1) {
    res.status(400).json({ error: 'Cannot delete the only admin account.' });
    return;
  }

  UserModel.deleteById(id);
  logAction({ actorId: req.user!.id, action: 'delete_user', entityType: 'user', entityId: id, payload: { email: target.email } });

  deleteKeycloakUser(target.keycloak_id).catch((err: Error) => {
    logger.warn(`Keycloak user deletion failed for ${id}: ${err.message}`);
  });

  res.status(204).send();
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
