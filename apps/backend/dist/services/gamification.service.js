"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XP_RULES = void 0;
exports.calculateLevel = calculateLevel;
exports.getLevelProgress = getLevelProgress;
exports.awardXp = awardXp;
exports.rebuildUserXp = rebuildUserXp;
const database_1 = require("../config/database");
// ─── XP rule map ──────────────────────────────────────────────────────────────
// Allowed XP sources: event attendance, badge unlocks, daily questions.
exports.XP_RULES = {
    event_attended: 25,
    badge_unlocked: 50,
    daily_question_participation: 5,
    daily_question_correct_bonus: 10,
};
// ─── Level threshold map ──────────────────────────────────────────────────────
const LEVEL_THRESHOLDS = [
    { level: 1, min: 0, max: 99 },
    { level: 2, min: 100, max: 249 },
    { level: 3, min: 250, max: 499 },
    { level: 4, min: 500, max: 799 },
    { level: 5, min: 800, max: 1199 },
    { level: 6, min: 1200, max: 1699 },
];
const MAX_LEVEL = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].level;
function calculateLevel(xpTotal) {
    for (const t of LEVEL_THRESHOLDS) {
        if (xpTotal <= t.max)
            return t.level;
    }
    return MAX_LEVEL;
}
function getLevelProgress(xpTotal) {
    const level = calculateLevel(xpTotal);
    const threshold = LEVEL_THRESHOLDS.find((t) => t.level === level);
    const isMaxLevel = level === MAX_LEVEL;
    const current_level_floor = threshold.min;
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
function awardXp(opts) {
    const xpDelta = opts.xpOverride ?? exports.XP_RULES[opts.actionKey];
    if (xpDelta === undefined || xpDelta === null)
        return null;
    const userRow = database_1.db
        .prepare('SELECT xp_total, current_level FROM users WHERE id = ?')
        .get(opts.userId);
    if (!userRow)
        return null;
    const previousLevel = userRow.current_level;
    const insertResult = database_1.db
        .prepare(`INSERT OR IGNORE INTO xp_transactions
         (user_id, action_key, xp_delta, source_type, source_id, reference_key, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(opts.userId, opts.actionKey, xpDelta, opts.sourceType ?? null, opts.sourceId ?? null, opts.referenceKey, opts.metadata ? JSON.stringify(opts.metadata) : null);
    if (insertResult.changes === 0) {
        const progress = getLevelProgress(userRow.xp_total);
        return { xp_awarded: 0, level_up: false, previous_level: previousLevel, new_level: previousLevel, progress };
    }
    const totalsRow = database_1.db
        .prepare('SELECT COALESCE(SUM(xp_delta), 0) as total FROM xp_transactions WHERE user_id = ?')
        .get(opts.userId);
    const newXp = totalsRow.total;
    const newLevel = calculateLevel(newXp);
    database_1.db.prepare('UPDATE users SET xp_total = ?, current_level = ? WHERE id = ?').run(newXp, newLevel, opts.userId);
    const progress = getLevelProgress(newXp);
    return {
        xp_awarded: xpDelta,
        level_up: newLevel > previousLevel,
        previous_level: previousLevel,
        new_level: newLevel,
        progress,
    };
}
// ─── Rebuild XP from allowed sources (backfill / repair) ─────────────────────
function rebuildUserXp(userId) {
    // Attendance (event_attended)
    const attendances = database_1.db
        .prepare(`SELECT event_id FROM attendance WHERE user_id = ?`)
        .all(userId);
    for (const a of attendances) {
        awardXp({
            userId,
            actionKey: 'event_attended',
            referenceKey: `attendance:${a.event_id}:${userId}`,
            sourceType: 'event',
            sourceId: a.event_id,
        });
    }
    // Badge unlocks (badge_unlocked)
    const badgeUnlocks = database_1.db
        .prepare(`SELECT badge_definition_id FROM badge_unlocks WHERE user_id = ?`)
        .all(userId);
    for (const b of badgeUnlocks) {
        awardXp({
            userId,
            actionKey: 'badge_unlocked',
            referenceKey: `badge:${b.badge_definition_id}:${userId}`,
            sourceType: 'badge',
            sourceId: b.badge_definition_id,
        });
    }
}
//# sourceMappingURL=gamification.service.js.map