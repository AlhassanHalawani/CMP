"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceModel = void 0;
const database_1 = require("../config/database");
const crypto_1 = __importDefault(require("crypto"));
exports.AttendanceModel = {
    findByEvent(eventId) {
        return database_1.db
            .prepare('SELECT * FROM attendance WHERE event_id = ? ORDER BY checked_in_at DESC')
            .all(eventId);
    },
    findByEventAndUser(eventId, userId) {
        return database_1.db
            .prepare('SELECT * FROM attendance WHERE event_id = ? AND user_id = ?')
            .get(eventId, userId);
    },
    checkIn(data) {
        const result = database_1.db
            .prepare('INSERT INTO attendance (event_id, user_id, method, qr_token) VALUES (?, ?, ?, ?)')
            .run(data.event_id, data.user_id, data.method, data.qr_token || null);
        return database_1.db.prepare('SELECT * FROM attendance WHERE id = ?').get(result.lastInsertRowid);
    },
    generateQrToken(eventId) {
        const token = crypto_1.default.randomBytes(32).toString('hex');
        return `${eventId}:${token}`;
    },
    verifyQrToken(token) {
        const parts = token.split(':');
        if (parts.length !== 2)
            return null;
        const eventId = parseInt(parts[0], 10);
        if (isNaN(eventId))
            return null;
        return { eventId, token: parts[1] };
    },
    countByEvent(eventId) {
        return database_1.db.prepare('SELECT COUNT(*) as count FROM attendance WHERE event_id = ?').get(eventId).count;
    },
};
//# sourceMappingURL=attendance.model.js.map