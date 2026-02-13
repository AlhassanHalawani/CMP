"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModel = void 0;
const database_1 = require("../config/database");
exports.NotificationModel = {
    create(data) {
        const result = database_1.db
            .prepare('INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)')
            .run(data.user_id, data.title, data.body || null, data.type || 'info');
        return database_1.db.prepare('SELECT * FROM notifications WHERE id = ?').get(result.lastInsertRowid);
    },
    listForUser(userId, params) {
        let sql = 'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC';
        const values = [userId];
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
    markRead(id) {
        database_1.db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
    },
    markAllRead(userId) {
        database_1.db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(userId);
    },
    countUnread(userId) {
        return database_1.db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(userId).count;
    },
};
//# sourceMappingURL=notification.model.js.map