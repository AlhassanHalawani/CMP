"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BadgeModel = void 0;
const database_1 = require("../config/database");
exports.BadgeModel = {
    listCatalog() {
        return database_1.db
            .prepare('SELECT * FROM badge_definitions WHERE is_active = 1 ORDER BY sort_order ASC')
            .all();
    },
    findDefinitionById(id) {
        return database_1.db.prepare('SELECT * FROM badge_definitions WHERE id = ?').get(id);
    },
    findDefinitionByCode(code) {
        return database_1.db.prepare('SELECT * FROM badge_definitions WHERE code = ?').get(code);
    },
    listUnlockedByUser(userId) {
        return database_1.db
            .prepare('SELECT * FROM badge_unlocks WHERE user_id = ? ORDER BY unlocked_at ASC')
            .all(userId);
    },
    unlock(badgeDefinitionId, userId, sourceType, sourceId) {
        const result = database_1.db
            .prepare(`INSERT OR IGNORE INTO badge_unlocks (badge_definition_id, user_id, source_type, source_id)
         VALUES (?, ?, ?, ?)`)
            .run(badgeDefinitionId, userId, sourceType ?? null, sourceId ?? null);
        if (result.changes === 0)
            return null;
        return database_1.db.prepare('SELECT * FROM badge_unlocks WHERE id = ?').get(result.lastInsertRowid);
    },
    getFeaturedBadgeId(userId) {
        const row = database_1.db
            .prepare('SELECT featured_badge_definition_id FROM users WHERE id = ?')
            .get(userId);
        return row?.featured_badge_definition_id ?? null;
    },
    setFeaturedBadge(userId, badgeDefinitionId) {
        database_1.db.prepare('UPDATE users SET featured_badge_definition_id = ? WHERE id = ?').run(badgeDefinitionId, userId);
    },
};
//# sourceMappingURL=badge.model.js.map