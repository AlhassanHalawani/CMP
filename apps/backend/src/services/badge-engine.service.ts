import { db } from '../config/database';
import { BadgeModel, BadgeDefinition, BadgeUnlock } from '../models/badge.model';

// ─── Metric computation ───────────────────────────────────────────────────────

export interface StudentBadgeMetrics {
  joined_clubs_count: number;
  distinct_club_pages_visited: number;
  attendance_count: number;
  daily_questions_correct_count: number;
  weekly_missions_completed_count: number;
}

export function getStudentBadgeMetrics(userId: number): StudentBadgeMetrics {
  const { joined_clubs_count } = db
    .prepare("SELECT COUNT(*) as joined_clubs_count FROM memberships WHERE user_id = ? AND status = 'active'")
    .get(userId) as { joined_clubs_count: number };

  // Count distinct club IDs from page view paths matching /clubs/:id (authenticated views only)
  const rows = db
    .prepare(
      `SELECT DISTINCT CAST(
         SUBSTR(path, LENGTH('/clubs/') + 1)
       AS INTEGER) AS club_id
       FROM page_views
       WHERE user_id = ?
         AND path GLOB '/clubs/[0-9]*'
         AND CAST(SUBSTR(path, LENGTH('/clubs/') + 1) AS INTEGER) > 0`,
    )
    .all(userId) as { club_id: number }[];
  const distinct_club_pages_visited = rows.length;

  const { attendance_count } = db
    .prepare('SELECT COUNT(*) as attendance_count FROM attendance WHERE user_id = ?')
    .get(userId) as { attendance_count: number };

  const { daily_questions_correct_count } = db
    .prepare(
      `SELECT COUNT(*) as daily_questions_correct_count
       FROM daily_question_answers
       WHERE user_id = ? AND is_correct = 1`,
    )
    .get(userId) as { daily_questions_correct_count: number };

  return {
    joined_clubs_count,
    distinct_club_pages_visited,
    attendance_count,
    daily_questions_correct_count,
    weekly_missions_completed_count: 0, // reserved for future weekly missions feature
  };
}

// ─── Badge evaluation ─────────────────────────────────────────────────────────

export function evaluateStudentBadges(userId: number): BadgeUnlock[] {
  const metrics = getStudentBadgeMetrics(userId);
  const definitions = BadgeModel.listCatalog().filter((d) => d.entity_type === 'student');

  const unlockedIds = new Set(BadgeModel.listUnlockedByUser(userId).map((u) => u.badge_definition_id));

  const newUnlocks: BadgeUnlock[] = [];
  for (const def of definitions) {
    if (unlockedIds.has(def.id)) continue;
    const value = (metrics as unknown as Record<string, number>)[def.metric_key] ?? 0;
    if (value >= def.threshold) {
      const unlock = BadgeModel.unlock(def.id, userId);
      if (unlock) newUnlocks.push(unlock);
    }
  }
  return newUnlocks;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function listUnlockedBadges(userId: number): Array<BadgeUnlock & { badge: BadgeDefinition }> {
  const unlocks = BadgeModel.listUnlockedByUser(userId);
  const catalog = new Map(BadgeModel.listCatalog().map((d) => [d.id, d]));
  return unlocks
    .filter((u) => catalog.has(u.badge_definition_id))
    .map((u) => ({ ...u, badge: catalog.get(u.badge_definition_id)! }));
}

export function listBadgeCatalog(): BadgeDefinition[] {
  return BadgeModel.listCatalog();
}

export function setFeaturedBadge(userId: number, badgeDefinitionId: number | null): void {
  if (badgeDefinitionId !== null) {
    const unlocks = BadgeModel.listUnlockedByUser(userId);
    const has = unlocks.some((u) => u.badge_definition_id === badgeDefinitionId);
    if (!has) {
      throw Object.assign(new Error('Badge not unlocked by this user'), { status: 403 });
    }
  }
  BadgeModel.setFeaturedBadge(userId, badgeDefinitionId);
}

export function getStudentBadgeProgress(userId: number) {
  const metrics = getStudentBadgeMetrics(userId);
  const catalog = BadgeModel.listCatalog().filter((d) => d.entity_type === 'student');
  const unlockMap = new Map(BadgeModel.listUnlockedByUser(userId).map((u) => [u.badge_definition_id, u]));
  const featuredId = BadgeModel.getFeaturedBadgeId(userId);

  const badges = catalog.map((def) => {
    const unlock = unlockMap.get(def.id);
    const current = (metrics as unknown as Record<string, number>)[def.metric_key] ?? 0;
    return {
      ...def,
      unlocked: !!unlock,
      unlocked_at: unlock?.unlocked_at ?? null,
      current_value: current,
      is_featured: def.id === featuredId,
    };
  });

  return { badges, metrics, featured_badge_definition_id: featuredId };
}
