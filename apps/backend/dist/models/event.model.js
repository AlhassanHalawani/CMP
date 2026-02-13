"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventModel = void 0;
const database_1 = require("../config/database");
exports.EventModel = {
    findById(id) {
        return database_1.db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    },
    listByClub(clubId) {
        return database_1.db.prepare('SELECT * FROM events WHERE club_id = ? ORDER BY starts_at DESC').all(clubId);
    },
    listUpcoming(limit = 10) {
        return database_1.db
            .prepare("SELECT * FROM events WHERE status = 'published' AND starts_at > datetime('now') ORDER BY starts_at ASC LIMIT ?")
            .all(limit);
    },
    list(params) {
        let sql = 'SELECT * FROM events';
        const conditions = [];
        const values = [];
        if (params?.status) {
            conditions.push('status = ?');
            values.push(params.status);
        }
        if (params?.clubId) {
            conditions.push('club_id = ?');
            values.push(params.clubId);
        }
        if (conditions.length)
            sql += ' WHERE ' + conditions.join(' AND ');
        sql += ' ORDER BY starts_at DESC';
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
    create(data) {
        const result = database_1.db
            .prepare(`INSERT INTO events (club_id, title, title_ar, description, description_ar, location, starts_at, ends_at, capacity, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(data.club_id, data.title, data.title_ar, data.description, data.description_ar, data.location, data.starts_at, data.ends_at, data.capacity, data.status, data.created_by);
        return exports.EventModel.findById(result.lastInsertRowid);
    },
    update(id, data) {
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(data)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
        if (fields.length === 0)
            return exports.EventModel.findById(id);
        values.push(id);
        database_1.db.prepare(`UPDATE events SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        return exports.EventModel.findById(id);
    },
    delete(id) {
        const result = database_1.db.prepare('DELETE FROM events WHERE id = ?').run(id);
        return result.changes > 0;
    },
    count(params) {
        let sql = 'SELECT COUNT(*) as count FROM events';
        const conditions = [];
        const values = [];
        if (params?.clubId) {
            conditions.push('club_id = ?');
            values.push(params.clubId);
        }
        if (params?.status) {
            conditions.push('status = ?');
            values.push(params.status);
        }
        if (conditions.length)
            sql += ' WHERE ' + conditions.join(' AND ');
        return database_1.db.prepare(sql).get(...values).count;
    },
};
//# sourceMappingURL=event.model.js.map