"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentBadgeMetrics = getStudentBadgeMetrics;
exports.evaluateStudentBadges = evaluateStudentBadges;
exports.listUnlockedBadges = listUnlockedBadges;
exports.listBadgeCatalog = listBadgeCatalog;
exports.setFeaturedBadge = setFeaturedBadge;
exports.getStudentBadgeProgress = getStudentBadgeProgress;
const database_1 = require("../config/database");
const badge_model_1 = require("../models/badge.model");
function getStudentBadgeMetrics(userId) {
    const { joined_clubs_count } = database_1.db
        .prepare("SELECT COUNT(*) as joined_clubs_count FROM memberships WHERE user_id = ? AND status = 'active'")
        .get(userId);
    // Count distinct club IDs from page view paths matching /clubs/:id (authenticated views only)
    const rows = database_1.db
        .prepare(`SELECT DISTINCT CAST(
         SUBSTR(path, LENGTH('/clubs/') + 1)
       AS INTEGER) AS club_id
       FROM page_views
       WHERE user_id = ?
         AND path GLOB '/clubs/[0-9]*'
         AND CAST(SUBSTR(path, LENGTH('/clubs/') + 1) AS INTEGER) > 0`)
        .all(userId);
    const distinct_club_pages_visited = rows.length;
    const { attendance_count } = database_1.db
        .prepare('SELECT COUNT(*) as attendance_count FROM attendance WHERE user_id = ?')
        .get(userId);
    const { daily_questions_correct_count } = database_1.db
        .prepare(`SELECT COUNT(*) as daily_questions_correct_count
       FROM daily_question_answers
       WHERE user_id = ? AND is_correct = 1`)
        .get(userId);
    return {
        joined_clubs_count,
        distinct_club_pages_visited,
        attendance_count,
        daily_questions_correct_count,
        weekly_missions_completed_count: 0, // reserved for future weekly missions feature
    };
}
// ─── Badge evaluation ─────────────────────────────────────────────────────────
function evaluateStudentBadges(userId) {
    const metrics = getStudentBadgeMetrics(userId);
    const definitions = badge_model_1.BadgeModel.listCatalog().filter((d) => d.entity_type === 'student');
    const unlockedIds = new Set(badge_model_1.BadgeModel.listUnlockedByUser(userId).map((u) => u.badge_definition_id));
    const newUnlocks = [];
    for (const def of definitions) {
        if (unlockedIds.has(def.id))
            continue;
        const value = metrics[def.metric_key] ?? 0;
        if (value >= def.threshold) {
            const unlock = badge_model_1.BadgeModel.unlock(def.id, userId);
            if (unlock)
                newUnlocks.push(unlock);
        }
    }
    return newUnlocks;
}
// ─── Public API ───────────────────────────────────────────────────────────────
function listUnlockedBadges(userId) {
    const unlocks = badge_model_1.BadgeModel.listUnlockedByUser(userId);
    const catalog = new Map(badge_model_1.BadgeModel.listCatalog().map((d) => [d.id, d]));
    return unlocks
        .filter((u) => catalog.has(u.badge_definition_id))
        .map((u) => ({ ...u, badge: catalog.get(u.badge_definition_id) }));
}
function listBadgeCatalog() {
    return badge_model_1.BadgeModel.listCatalog();
}
function setFeaturedBadge(userId, badgeDefinitionId) {
    if (badgeDefinitionId !== null) {
        const unlocks = badge_model_1.BadgeModel.listUnlockedByUser(userId);
        const has = unlocks.some((u) => u.badge_definition_id === badgeDefinitionId);
        if (!has) {
            throw Object.assign(new Error('Badge not unlocked by this user'), { status: 403 });
        }
    }
    badge_model_1.BadgeModel.setFeaturedBadge(userId, badgeDefinitionId);
}
function getStudentBadgeProgress(userId) {
    const metrics = getStudentBadgeMetrics(userId);
    const catalog = badge_model_1.BadgeModel.listCatalog().filter((d) => d.entity_type === 'student');
    const unlockMap = new Map(badge_model_1.BadgeModel.listUnlockedByUser(userId).map((u) => [u.badge_definition_id, u]));
    const featuredId = badge_model_1.BadgeModel.getFeaturedBadgeId(userId);
    const badges = catalog.map((def) => {
        const unlock = unlockMap.get(def.id);
        const current = metrics[def.metric_key] ?? 0;
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
//# sourceMappingURL=badge-engine.service.js.map