"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderRequestModel = void 0;
const database_1 = require("../config/database");
exports.LeaderRequestModel = {
    findById(id) {
        return database_1.db.prepare('SELECT * FROM leader_requests WHERE id = ?').get(id);
    },
    findPendingByUserAndClub(userId, clubId) {
        return database_1.db
            .prepare("SELECT * FROM leader_requests WHERE user_id = ? AND club_id = ? AND status = 'pending'")
            .get(userId, clubId);
    },
    listAll(params) {
        let sql = `
      SELECT lr.*,
             u.name AS user_name,
             u.email AS user_email,
             c.name AS club_name
      FROM leader_requests lr
      JOIN users u ON u.id = lr.user_id
      JOIN clubs c ON c.id = lr.club_id
    `;
        const values = [];
        if (params?.status) {
            sql += ' WHERE lr.status = ?';
            values.push(params.status);
        }
        sql += ' ORDER BY lr.created_at DESC';
        if (params?.limit) {
            sql += ' LIMIT ?';
            values.push(params.limit);
        }
        if (params?.offset) {
            sql += ' OFFSET ?';
            values.push(params.offset);
        }
        return database_1.db.prepare(sql).all(...values);
    },
    listByUser(userId) {
        return database_1.db.prepare(`
      SELECT lr.*,
             u.name AS user_name,
             u.email AS user_email,
             c.name AS club_name
      FROM leader_requests lr
      JOIN users u ON u.id = lr.user_id
      JOIN clubs c ON c.id = lr.club_id
      WHERE lr.user_id = ?
      ORDER BY lr.created_at DESC
    `).all(userId);
    },
    create(data) {
        const result = database_1.db
            .prepare('INSERT INTO leader_requests (user_id, club_id, message) VALUES (?, ?, ?)')
            .run(data.user_id, data.club_id, data.message ?? null);
        return exports.LeaderRequestModel.findById(result.lastInsertRowid);
    },
    updateStatus(id, status, reviewedBy, adminNotes) {
        database_1.db.prepare(`
      UPDATE leader_requests
      SET status = ?, reviewed_by = ?, reviewed_at = datetime('now'), admin_notes = ?
      WHERE id = ?
    `).run(status, reviewedBy, adminNotes ?? null, id);
        return exports.LeaderRequestModel.findById(id);
    },
    countPending() {
        return database_1.db.prepare("SELECT COUNT(*) as cnt FROM leader_requests WHERE status = 'pending'").get().cnt;
    },
};
//# sourceMappingURL=leader-request.model.js.map