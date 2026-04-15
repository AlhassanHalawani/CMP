import { db } from '../config/database';

export interface AchievementDefinition {
  id: number;
  code: string;
  entity_type: 'student' | 'club';
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  tier: 'Bronze' | 'Silver' | 'Gold';
  points: number;
  metric: string;
  threshold: number;
  is_active: number;
}

export interface AchievementUnlock {
  id: number;
  definition_id: number;
  entity_type: string;
  entity_id: number;
  unlocked_at: string;
}

export interface StudentMetrics {
  attendance_count: number;
  login_streak: number;
}

export interface ClubMetrics {
  published_event_count: number;
  active_member_count: number;
  verified_attendance_total: number;
  max_single_event_participants: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeLoginStreak(userId: number): number {
  const rows = db
    .prepare('SELECT login_date FROM user_login_activity WHERE user_id = ? ORDER BY login_date DESC')
    .all(userId) as { login_date: string }[];

  if (rows.length === 0) return 0;

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  // Streak must include today or yesterday to be live
  if (rows[0].login_date !== today && rows[0].login_date !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < rows.length; i++) {
    const prev = new Date(rows[i - 1].login_date).getTime();
    const curr = new Date(rows[i].login_date).getTime();
    if ((prev - curr) / 86_400_000 === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ─── Metric computation ───────────────────────────────────────────────────────

export function getStudentMetrics(userId: number): StudentMetrics {
  const { cnt } = db
    .prepare('SELECT COUNT(*) as cnt FROM attendance WHERE user_id = ?')
    .get(userId) as { cnt: number };

  return {
    attendance_count: cnt,
    login_streak: computeLoginStreak(userId),
  };
}

export function getClubMetrics(clubId: number): ClubMetrics {
  const { published_event_count } = db
    .prepare("SELECT COUNT(*) as published_event_count FROM events WHERE club_id = ? AND status = 'published'")
    .get(clubId) as { published_event_count: number };

  const { active_member_count } = db
    .prepare("SELECT COUNT(*) as active_member_count FROM memberships WHERE club_id = ? AND status = 'active'")
    .get(clubId) as { active_member_count: number };

  const { verified_attendance_total } = db
    .prepare(
      `SELECT COUNT(a.id) as verified_attendance_total
       FROM attendance a
       JOIN events e ON e.id = a.event_id
       WHERE e.club_id = ? AND e.status = 'published'`,
    )
    .get(clubId) as { verified_attendance_total: number };

  const { max_single_event_participants } = db
    .prepare(
      `SELECT COALESCE(MAX(cnt), 0) as max_single_event_participants
       FROM (
         SELECT COUNT(*) as cnt
         FROM registrations r
         JOIN events e ON e.id = r.event_id
         WHERE e.club_id = ? AND e.status = 'published' AND r.status != 'cancelled'
         GROUP BY r.event_id
       )`,
    )
    .get(clubId) as { max_single_event_participants: number };

  return {
    published_event_count,
    active_member_count,
    verified_attendance_total,
    max_single_event_participants,
  };
}

// ─── Evaluators ───────────────────────────────────────────────────────────────

export function evaluateStudentAchievements(userId: number): AchievementUnlock[] {
  const metrics = getStudentMetrics(userId);
  const definitions = db
    .prepare("SELECT * FROM achievement_definitions WHERE entity_type = 'student' AND is_active = 1")
    .all() as AchievementDefinition[];

  const unlockedIds = new Set(
    (
      db
        .prepare("SELECT definition_id FROM achievement_unlocks WHERE entity_type = 'student' AND entity_id = ?")
        .all(userId) as { definition_id: number }[]
    ).map((r) => r.definition_id),
  );

  const newUnlocks: AchievementUnlock[] = [];
  const insertStmt = db.prepare(
    `INSERT OR IGNORE INTO achievement_unlocks (definition_id, entity_type, entity_id)
     VALUES (?, 'student', ?)`,
  );

  for (const def of definitions) {
    if (unlockedIds.has(def.id)) continue;
    const value = (metrics as unknown as Record<string, number>)[def.metric] ?? 0;
    if (value >= def.threshold) {
      const result = insertStmt.run(def.id, userId);
      if (result.changes > 0) {
        newUnlocks.push({
          id: result.lastInsertRowid as number,
          definition_id: def.id,
          entity_type: 'student',
          entity_id: userId,
          unlocked_at: new Date().toISOString(),
        });
      }
    }
  }

  return newUnlocks;
}

export function evaluateClubAchievements(clubId: number): AchievementUnlock[] {
  const metrics = getClubMetrics(clubId);
  const definitions = db
    .prepare("SELECT * FROM achievement_definitions WHERE entity_type = 'club' AND is_active = 1")
    .all() as AchievementDefinition[];

  const unlockedIds = new Set(
    (
      db
        .prepare("SELECT definition_id FROM achievement_unlocks WHERE entity_type = 'club' AND entity_id = ?")
        .all(clubId) as { definition_id: number }[]
    ).map((r) => r.definition_id),
  );

  const newUnlocks: AchievementUnlock[] = [];
  const insertStmt = db.prepare(
    `INSERT OR IGNORE INTO achievement_unlocks (definition_id, entity_type, entity_id)
     VALUES (?, 'club', ?)`,
  );

  for (const def of definitions) {
    if (unlockedIds.has(def.id)) continue;
    const value = (metrics as unknown as Record<string, number>)[def.metric] ?? 0;
    if (value >= def.threshold) {
      const result = insertStmt.run(def.id, clubId);
      if (result.changes > 0) {
        newUnlocks.push({
          id: result.lastInsertRowid as number,
          definition_id: def.id,
          entity_type: 'club',
          entity_id: clubId,
          unlocked_at: new Date().toISOString(),
        });
      }
    }
  }

  return newUnlocks;
}

// ─── Progress queries (for API endpoints) ────────────────────────────────────

export function getStudentProgress(userId: number) {
  const metrics = getStudentMetrics(userId);
  const definitions = db
    .prepare(
      "SELECT * FROM achievement_definitions WHERE entity_type = 'student' AND is_active = 1 ORDER BY threshold ASC",
    )
    .all() as AchievementDefinition[];
  const unlocks = db
    .prepare("SELECT * FROM achievement_unlocks WHERE entity_type = 'student' AND entity_id = ?")
    .all(userId) as AchievementUnlock[];
  return { definitions, unlocks, metrics };
}

export function getClubProgress(clubId: number) {
  const metrics = getClubMetrics(clubId);
  const definitions = db
    .prepare(
      "SELECT * FROM achievement_definitions WHERE entity_type = 'club' AND is_active = 1 ORDER BY threshold ASC",
    )
    .all() as AchievementDefinition[];
  const unlocks = db
    .prepare("SELECT * FROM achievement_unlocks WHERE entity_type = 'club' AND entity_id = ?")
    .all(clubId) as AchievementUnlock[];
  return { definitions, unlocks, metrics };
}
