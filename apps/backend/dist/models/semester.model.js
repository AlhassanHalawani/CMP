"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemesterModel = void 0;
const database_1 = require("../config/database");
exports.SemesterModel = {
    findById(id) {
        return database_1.db.prepare('SELECT * FROM semesters WHERE id = ?').get(id);
    },
    getActive() {
        return database_1.db.prepare('SELECT * FROM semesters WHERE is_active = 1').get();
    },
    list() {
        return database_1.db.prepare('SELECT * FROM semesters ORDER BY starts_at DESC').all();
    },
    create(data) {
        const result = database_1.db
            .prepare('INSERT INTO semesters (name, starts_at, ends_at) VALUES (?, ?, ?)')
            .run(data.name, data.starts_at, data.ends_at);
        return exports.SemesterModel.findById(result.lastInsertRowid);
    },
    setActive(id) {
        const txn = database_1.db.transaction(() => {
            database_1.db.prepare('UPDATE semesters SET is_active = 0').run();
            database_1.db.prepare('UPDATE semesters SET is_active = 1 WHERE id = ?').run(id);
        });
        txn();
    },
    delete(id) {
        const result = database_1.db.prepare('DELETE FROM semesters WHERE id = ?').run(id);
        return result.changes > 0;
    },
};
//# sourceMappingURL=semester.model.js.map