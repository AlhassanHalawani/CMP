import { db } from '../config/database';

// ─── XP rule map ──────────────────────────────────────────────────────────────

export const XP_RULES: Record<string, number> = {
  membership_joined: 40,
  event_attended: 25,
  daily_login: 5,
  profile_completed: 20,
  weekly_task_completed: 15,
  daily_quiz_answered: 10,
  club_activity_participated: 20,
  // Daily question events use per-question XP passed via xpOverride
  daily_question_participation: 5,
  daily_question_correct_bonus: 10,
};

// ─── Level threshold map ──────────────────────────────────────────────────────

const LEVEL_THRESHOLDS: { level: number; min: number; max: number }[] = [
  { level: 1, min: 0,    max: 99   },
  { level: 2, min: 100,  max: 249  },
  { level: 3, min: 250,  max: 499  },
  { level: 4, min: 500,  max: 799  },
  { level: 5, min: 800,  max: 1199 },
  { level: 6, min: 1200, max: 1699 },
];

const MAX_LEVEL = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].level;
const MAX_LEVEL_FLOOR = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].min;

export function calculateLevel(xpTotal: number): number {
  for (const t of LEVEL_THRESHOLDS) {
    if (xpTotal <= t.max) return t.level;
  }
  return MAX_LEVEL;
}

export interface LevelProgress {
  current_xp: number;
  current_level: number;
  current_level_floor: number;
  next_level_xp: number;
  xp_to_next_level: number;
  progress_percent: number;
}

export function getLevelProgress(xpTotal: number): LevelProgress {
  const level = calculateLevel(xpTotal);
  const threshold = LEVEL_THRESHOLDS.find((t) => t.level === level)!;
  const isMaxLevel = level === MAX_LEVEL;

  const current_level_floor = threshold.min;
  // At max level, next_level_xp is the same as the floor so progress stays at 100%
  const next_level_xp = isMaxLevel
    ? threshold.max + 1
    : (LEVEL_THRESHOLDS.find((t) => t.level === level + 1)?.min ?? threshold.max + 1);

  const range = next_level_xp - current_level_floor;
  const progress_percent = isMaxLevel
    ? 100
    : Math.round(((xpTotal - current_level_floor) / range) * 100);

  return {
    current_xp: xpTotal,
    current_level: level,
    current_level_floor,
    next_level_xp,
    xp_to_next_level: isMaxLevel ? 0 : next_level_xp - xpTotal,
    progress_percent,
  };
}

// ─── Award XP (idempotent via reference_key) ─────────────────────────────────

export interface AwardXpOptions {
  userId: number;
  actionKey: string;
  referenceKey: string;
  xpOverride?: number;
  sourceType?: string;
  sourceId?: number;
  metadata?: Record<string, unknown>;
}

export interface AwardXpResult {
  xp_awarded: number;
  level_up: boolean;
  previous_level: number;
  new_level: number;
  progress: LevelProgress;
}

export function awardXp(opts: AwardXpOptions): AwardXpResult | null {
  const xpDelta = opts.xpOverride ?? XP_RULES[opts.actionKey];
  if (xpDelta === undefined || xpDelta === null) return null;

  // Fetch current state before any change
  const userRow = db
    .prepare('SELECT xp_total, current_level FROM users WHERE id = ?')
    .get(opts.userId) as { xp_total: number; current_level: number } | undefined;
  if (!userRow) return null;

  const previousLevel = userRow.current_level;

  // Insert transaction — silently skip if reference_key already exists (idempotent)
  const insertResult = db
    .prepare(
      `INSERT OR IGNORE INTO xp_transactions
         (user_id, action_key, xp_delta, source_type, source_id, reference_key, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      opts.userId,
      opts.actionKey,
      xpDelta,
      opts.sourceType ?? null,
      opts.sourceId ?? null,
      opts.referenceKey,
      opts.metadata ? JSON.stringify(opts.metadata) : null
    );

  // If nothing was inserted, this action was already rewarded
  if (insertResult.changes === 0) {
    const progress = getLevelProgress(userRow.xp_total);
    return { xp_awarded: 0, level_up: false, previous_level: previousLevel, new_level: previousLevel, progress };
  }

  // Recompute totals from ledger (single source of truth)
  const totalsRow = db
    .prepare('SELECT COALESCE(SUM(xp_delta), 0) as total FROM xp_transactions WHERE user_id = ?')
    .get(opts.userId) as { total: number };
  const newXp = totalsRow.total;
  const newLevel = calculateLevel(newXp);

  db.prepare('UPDATE users SET xp_total = ?, current_level = ? WHERE id = ?').run(
    newXp,
    newLevel,
    opts.userId
  );

  const progress = getLevelProgress(newXp);
  return {
    xp_awarded: xpDelta,
    level_up: newLevel > previousLevel,
    previous_level: previousLevel,
    new_level: newLevel,
    progress,
  };
}

// ─── Rebuild XP from existing history (backfill / repair) ────────────────────

export function rebuildUserXp(userId: number): void {
  // Memberships
  const memberships = db
    .prepare(`SELECT club_id FROM memberships WHERE user_id = ? AND status = 'active'`)
    .all(userId) as { club_id: number }[];
  for (const m of memberships) {
    awardXp({
      userId,
      actionKey: 'membership_joined',
      referenceKey: `membership:${m.club_id}:${userId}`,
      sourceType: 'membership',
      sourceId: m.club_id,
    });
  }

  // Attendance
  const attendances = db
    .prepare(`SELECT event_id FROM attendance WHERE user_id = ?`)
    .all(userId) as { event_id: number }[];
  for (const a of attendances) {
    awardXp({
      userId,
      actionKey: 'event_attended',
      referenceKey: `attendance:${a.event_id}:${userId}`,
      sourceType: 'event',
      sourceId: a.event_id,
    });
  }

  // Login activity
  const logins = db
    .prepare(`SELECT login_date FROM user_login_activity WHERE user_id = ?`)
    .all(userId) as { login_date: string }[];
  for (const l of logins) {
    awardXp({
      userId,
      actionKey: 'daily_login',
      referenceKey: `login:${userId}:${l.login_date}`,
    });
  }
}
