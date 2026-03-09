"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipModel = void 0;
const database_1 = require("../config/database");
exports.MembershipModel = {
    findByClubAndUser(clubId, userId) {
        return database_1.db
            .prepare('SELECT * FROM memberships WHERE club_id = ? AND user_id = ?')
            .get(clubId, userId);
    },
    findByClub(clubId, status) {
        if (status) {
            return database_1.db
                .prepare(`SELECT m.*, u.name, u.email, u.avatar_url
           FROM memberships m
           JOIN users u ON u.id = m.user_id
           WHERE m.club_id = ? AND m.status = ?
           ORDER BY m.requested_at DESC`)
                .all(clubId, status);
        }
        return database_1.db
            .prepare(`SELECT m.*, u.name, u.email, u.avatar_url
         FROM memberships m
         JOIN users u ON u.id = m.user_id
         WHERE m.club_id = ?
         ORDER BY m.requested_at DESC`)
            .all(clubId);
    },
    findByUser(userId) {
        return database_1.db
            .prepare('SELECT * FROM memberships WHERE user_id = ? ORDER BY requested_at DESC')
            .all(userId);
    },
    create(clubId, userId) {
        const result = database_1.db
            .prepare('INSERT INTO memberships (club_id, user_id, status) VALUES (?, ?, ?)')
            .run(clubId, userId, 'pending');
        return database_1.db
            .prepare('SELECT * FROM memberships WHERE id = ?')
            .get(result.lastInsertRowid);
    },
    updateStatus(id, status) {
        database_1.db.prepare("UPDATE memberships SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
        return database_1.db.prepare('SELECT * FROM memberships WHERE id = ?').get(id);
    },
    countActive(clubId) {
        return database_1.db
            .prepare("SELECT COUNT(*) as count FROM memberships WHERE club_id = ? AND status = 'active'")
            .get(clubId).count;
    },
};
//# sourceMappingURL=membership.model.js.map