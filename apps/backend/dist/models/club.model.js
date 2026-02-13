"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClubModel = void 0;
const database_1 = require("../config/database");
exports.ClubModel = {
    findById(id) {
        return database_1.db.prepare('SELECT * FROM clubs WHERE id = ?').get(id);
    },
    list(params) {
        let sql = 'SELECT * FROM clubs ORDER BY created_at DESC';
        const values = [];
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
            .prepare('INSERT INTO clubs (name, name_ar, description, description_ar, logo_url, leader_id) VALUES (?, ?, ?, ?, ?, ?)')
            .run(data.name, data.name_ar, data.description, data.description_ar, data.logo_url, data.leader_id);
        return exports.ClubModel.findById(result.lastInsertRowid);
    },
    update(id, data) {
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(data)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
        if (fields.length === 0)
            return exports.ClubModel.findById(id);
        values.push(id);
        database_1.db.prepare(`UPDATE clubs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        return exports.ClubModel.findById(id);
    },
    delete(id) {
        const result = database_1.db.prepare('DELETE FROM clubs WHERE id = ?').run(id);
        return result.changes > 0;
    },
    count() {
        return database_1.db.prepare('SELECT COUNT(*) as count FROM clubs').get().count;
    },
};
//# sourceMappingURL=club.model.js.map