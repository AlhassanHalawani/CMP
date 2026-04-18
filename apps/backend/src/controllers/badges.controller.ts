import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { BadgeModel } from '../models/badge.model';
import {
  listBadgeCatalog,
  listUnlockedBadges,
  getStudentBadgeProgress,
  setFeaturedBadge,
} from '../services/badge-engine.service';

export function getCatalog(_req: AuthRequest, res: Response) {
  res.json({ data: listBadgeCatalog() });
}

export function getMyBadges(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const unlocked = listUnlockedBadges(userId);
  res.json({
    featured_badge_definition_id: BadgeModel.getFeaturedBadgeId(userId),
    unlocked: unlocked.map((u) => ({
      badge_definition_id: u.badge_definition_id,
      code: u.badge.code,
      name: u.badge.name,
      name_ar: u.badge.name_ar,
      rarity: u.badge.rarity,
      icon_key: u.badge.icon_key,
      unlocked_at: u.unlocked_at,
    })),
  });
}

export function getMyProgress(req: AuthRequest, res: Response) {
  res.json(getStudentBadgeProgress(req.user!.id));
}

export function patchFeaturedBadge(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const { badge_definition_id } = req.body;

  const id = badge_definition_id === null ? null : Number(badge_definition_id);
  if (id !== null && !Number.isInteger(id)) {
    res.status(400).json({ error: 'badge_definition_id must be an integer or null' });
    return;
  }

  try {
    setFeaturedBadge(userId, id);
    res.json({ featured_badge_definition_id: id });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
}
