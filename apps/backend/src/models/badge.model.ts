import { db } from '../config/database';

export interface BadgeDefinition {
  id: number;
  code: string;
  entity_type: string;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  icon_key: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  metric_key: string;
  threshold: number;
  is_active: number;
  sort_order: number;
}

export interface BadgeUnlock {
  id: number;
  badge_definition_id: number;
  user_id: number;
  unlocked_at: string;
  source_type: string | null;
  source_id: number | null;
}

export const BadgeModel = {
  listCatalog(): BadgeDefinition[] {
    return db
      .prepare('SELECT * FROM badge_definitions WHERE is_active = 1 ORDER BY sort_order ASC')
      .all() as BadgeDefinition[];
  },

  findDefinitionById(id: number): BadgeDefinition | undefined {
    return db.prepare('SELECT * FROM badge_definitions WHERE id = ?').get(id) as BadgeDefinition | undefined;
  },

  findDefinitionByCode(code: string): BadgeDefinition | undefined {
    return db.prepare('SELECT * FROM badge_definitions WHERE code = ?').get(code) as BadgeDefinition | undefined;
  },

  listUnlockedByUser(userId: number): BadgeUnlock[] {
    return db
      .prepare('SELECT * FROM badge_unlocks WHERE user_id = ? ORDER BY unlocked_at ASC')
      .all(userId) as BadgeUnlock[];
  },

  unlock(badgeDefinitionId: number, userId: number, sourceType?: string | null, sourceId?: number | null): BadgeUnlock | null {
    const result = db
      .prepare(
        `INSERT OR IGNORE INTO badge_unlocks (badge_definition_id, user_id, source_type, source_id)
         VALUES (?, ?, ?, ?)`,
      )
      .run(badgeDefinitionId, userId, sourceType ?? null, sourceId ?? null);

    if (result.changes === 0) return null;
    return db.prepare('SELECT * FROM badge_unlocks WHERE id = ?').get(result.lastInsertRowid) as BadgeUnlock;
  },

  getFeaturedBadgeId(userId: number): number | null {
    const row = db
      .prepare('SELECT featured_badge_definition_id FROM users WHERE id = ?')
      .get(userId) as { featured_badge_definition_id: number | null } | undefined;
    return row?.featured_badge_definition_id ?? null;
  },

  setFeaturedBadge(userId: number, badgeDefinitionId: number | null): void {
    db.prepare('UPDATE users SET featured_badge_definition_id = ? WHERE id = ?').run(badgeDefinitionId, userId);
  },
};
