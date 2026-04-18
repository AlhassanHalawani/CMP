"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentMetrics = getStudentMetrics;
exports.getClubMetrics = getClubMetrics;
exports.evaluateStudentAchievements = evaluateStudentAchievements;
exports.evaluateClubAchievements = evaluateClubAchievements;
exports.getStudentProgress = getStudentProgress;
exports.getClubProgress = getClubProgress;
const database_1 = require("../config/database");
// ─── Helpers ──────────────────────────────────────────────────────────────────
function computeLoginStreak(userId) {
    const rows = database_1.db
        .prepare('SELECT login_date FROM user_login_activity WHERE user_id = ? ORDER BY login_date DESC')
        .all(userId);
    if (rows.length === 0)
        return 0;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    // Streak must include today or yesterday to be live
    if (rows[0].login_date !== today && rows[0].login_date !== yesterday)
        return 0;
    let streak = 1;
    for (let i = 1; i < rows.length; i++) {
        const prev = new Date(rows[i - 1].login_date).getTime();
        const curr = new Date(rows[i].login_date).getTime();
        if ((prev - curr) / 86_400_000 === 1) {
            streak++;
        }
        else {
            break;
        }
    }
    return streak;
}
// ─── Metric computation ───────────────────────────────────────────────────────
function getStudentMetrics(userId) {
    const { cnt } = database_1.db
        .prepare('SELECT COUNT(*) as cnt FROM attendance WHERE user_id = ?')
        .get(userId);
    return {
        attendance_count: cnt,
        login_streak: computeLoginStreak(userId),
    };
}
function getClubMetrics(clubId) {
    const { published_event_count } = database_1.db
        .prepare("SELECT COUNT(*) as published_event_count FROM events WHERE club_id = ? AND status = 'published'")
        .get(clubId);
    const { active_member_count } = database_1.db
        .prepare("SELECT COUNT(*) as active_member_count FROM memberships WHERE club_id = ? AND status = 'active'")
        .get(clubId);
    const { verified_attendance_total } = database_1.db
        .prepare(`SELECT COUNT(a.id) as verified_attendance_total
       FROM attendance a
       JOIN events e ON e.id = a.event_id
       WHERE e.club_id = ? AND e.status = 'published'`)
        .get(clubId);
    const { max_single_event_participants } = database_1.db
        .prepare(`SELECT COALESCE(MAX(cnt), 0) as max_single_event_participants
       FROM (
         SELECT COUNT(*) as cnt
         FROM registrations r
         JOIN events e ON e.id = r.event_id
         WHERE e.club_id = ? AND e.status = 'published' AND r.status != 'cancelled'
         GROUP BY r.event_id
       )`)
        .get(clubId);
    return {
        published_event_count,
        active_member_count,
        verified_attendance_total,
        max_single_event_participants,
    };
}
// ─── Evaluators ───────────────────────────────────────────────────────────────
function evaluateStudentAchievements(userId) {
    const metrics = getStudentMetrics(userId);
    const definitions = database_1.db
        .prepare("SELECT * FROM achievement_definitions WHERE entity_type = 'student' AND is_active = 1")
        .all();
    const unlockedIds = new Set(database_1.db
        .prepare("SELECT definition_id FROM achievement_unlocks WHERE entity_type = 'student' AND entity_id = ?")
        .all(userId).map((r) => r.definition_id));
    const newUnlocks = [];
    const insertStmt = database_1.db.prepare(`INSERT OR IGNORE INTO achievement_unlocks (definition_id, entity_type, entity_id)
     VALUES (?, 'student', ?)`);
    for (const def of definitions) {
        if (unlockedIds.has(def.id))
            continue;
        const value = metrics[def.metric] ?? 0;
        if (value >= def.threshold) {
            const result = insertStmt.run(def.id, userId);
            if (result.changes > 0) {
                newUnlocks.push({
                    id: result.lastInsertRowid,
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
function evaluateClubAchievements(clubId) {
    const metrics = getClubMetrics(clubId);
    const definitions = database_1.db
        .prepare("SELECT * FROM achievement_definitions WHERE entity_type = 'club' AND is_active = 1")
        .all();
    const unlockedIds = new Set(database_1.db
        .prepare("SELECT definition_id FROM achievement_unlocks WHERE entity_type = 'club' AND entity_id = ?")
        .all(clubId).map((r) => r.definition_id));
    const newUnlocks = [];
    const insertStmt = database_1.db.prepare(`INSERT OR IGNORE INTO achievement_unlocks (definition_id, entity_type, entity_id)
     VALUES (?, 'club', ?)`);
    for (const def of definitions) {
        if (unlockedIds.has(def.id))
            continue;
        const value = metrics[def.metric] ?? 0;
        if (value >= def.threshold) {
            const result = insertStmt.run(def.id, clubId);
            if (result.changes > 0) {
                newUnlocks.push({
                    id: result.lastInsertRowid,
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
function getStudentProgress(userId) {
    const metrics = getStudentMetrics(userId);
    const definitions = database_1.db
        .prepare("SELECT * FROM achievement_definitions WHERE entity_type = 'student' AND is_active = 1 ORDER BY threshold ASC")
        .all();
    const unlocks = database_1.db
        .prepare("SELECT * FROM achievement_unlocks WHERE entity_type = 'student' AND entity_id = ?")
        .all(userId);
    return { definitions, unlocks, metrics };
}
function getClubProgress(clubId) {
    const metrics = getClubMetrics(clubId);
    const definitions = database_1.db
        .prepare("SELECT * FROM achievement_definitions WHERE entity_type = 'club' AND is_active = 1 ORDER BY threshold ASC")
        .all();
    const unlocks = database_1.db
        .prepare("SELECT * FROM achievement_unlocks WHERE entity_type = 'club' AND entity_id = ?")
        .all(clubId);
    return { definitions, unlocks, metrics };
}
//# sourceMappingURL=achievement-engine.service.js.map