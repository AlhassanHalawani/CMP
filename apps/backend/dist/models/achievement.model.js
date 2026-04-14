"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AchievementModel = void 0;
const database_1 = require("../config/database");
exports.AchievementModel = {
    findById(id) {
        return database_1.db.prepare('SELECT * FROM achievements WHERE id = ?').get(id);
    },
    findByUser(userId) {
        return database_1.db
            .prepare('SELECT * FROM achievements WHERE user_id = ? ORDER BY awarded_at DESC')
            .all(userId);
    },
    findByClub(clubId) {
        return database_1.db
            .prepare('SELECT * FROM achievements WHERE club_id = ? ORDER BY awarded_at DESC')
            .all(clubId);
    },
    create(data) {
        const result = database_1.db
            .prepare('INSERT INTO achievements (user_id, club_id, title, title_ar, description, description_ar, semester_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(data.user_id, data.club_id, data.title, data.title_ar, data.description, data.description_ar, data.semester_id);
        return exports.AchievementModel.findById(result.lastInsertRowid);
    },
    findByUserFiltered(userId, opts) {
        let sql = 'SELECT * FROM achievements WHERE user_id = ?';
        const params = [userId];
        if (opts.semesterId) {
            sql += ' AND semester_id = ?';
            params.push(opts.semesterId);
        }
        if (opts.clubId) {
            sql += ' AND club_id = ?';
            params.push(opts.clubId);
        }
        sql += ' ORDER BY awarded_at DESC';
        return database_1.db.prepare(sql).all(...params);
    },
    findAll(opts = {}) {
        let sql = 'SELECT * FROM achievements WHERE 1=1';
        const params = [];
        if (opts.userId) {
            sql += ' AND user_id = ?';
            params.push(opts.userId);
        }
        if (opts.clubId) {
            sql += ' AND club_id = ?';
            params.push(opts.clubId);
        }
        if (opts.semesterId) {
            sql += ' AND semester_id = ?';
            params.push(opts.semesterId);
        }
        sql += ' ORDER BY awarded_at DESC';
        return database_1.db.prepare(sql).all(...params);
    },
    delete(id) {
        const result = database_1.db.prepare('DELETE FROM achievements WHERE id = ?').run(id);
        return result.changes > 0;
    },
};
//# sourceMappingURL=achievement.model.js.map