"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistrationModel = void 0;
const database_1 = require("../config/database");
exports.RegistrationModel = {
    findById(id) {
        return database_1.db.prepare('SELECT * FROM registrations WHERE id = ?').get(id);
    },
    findByEventAndUser(eventId, userId) {
        return database_1.db
            .prepare('SELECT * FROM registrations WHERE event_id = ? AND user_id = ?')
            .get(eventId, userId);
    },
    findByEvent(eventId) {
        return database_1.db
            .prepare('SELECT * FROM registrations WHERE event_id = ? ORDER BY registered_at DESC')
            .all(eventId);
    },
    findByUser(userId) {
        return database_1.db
            .prepare('SELECT * FROM registrations WHERE user_id = ? ORDER BY registered_at DESC')
            .all(userId);
    },
    create(data) {
        const result = database_1.db
            .prepare('INSERT INTO registrations (event_id, user_id, status) VALUES (?, ?, ?)')
            .run(data.event_id, data.user_id, data.status || 'confirmed');
        return exports.RegistrationModel.findById(result.lastInsertRowid);
    },
    updateStatus(id, status) {
        database_1.db.prepare('UPDATE registrations SET status = ? WHERE id = ?').run(status, id);
    },
    countByEvent(eventId) {
        return database_1.db
            .prepare("SELECT COUNT(*) as count FROM registrations WHERE event_id = ? AND status != 'cancelled'")
            .get(eventId).count;
    },
};
//# sourceMappingURL=registration.model.js.map