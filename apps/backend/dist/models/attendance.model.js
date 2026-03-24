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
    findPresentWithUsers(eventId) {
        return database_1.db
            .prepare(`
        SELECT u.name, u.email, a.checked_in_at, a.method
        FROM attendance a
        JOIN users u ON u.id = a.user_id
        WHERE a.event_id = ?
        ORDER BY a.checked_in_at
      `)
            .all(eventId);
    },
    findNoShowsWithUsers(eventId) {
        return database_1.db
            .prepare(`
        SELECT u.name, u.email, r.registered_at
        FROM registrations r
        JOIN users u ON u.id = r.user_id
        LEFT JOIN attendance a ON a.event_id = r.event_id AND a.user_id = r.user_id
        WHERE r.event_id = ? AND r.status = 'confirmed' AND a.id IS NULL
        ORDER BY u.name
      `)
            .all(eventId);
    },
    findClubReport(clubId, startsAfter, endsBefore) {
        return database_1.db
            .prepare(`
        SELECT e.title AS event_title, e.starts_at AS event_starts_at,
               u.name, u.email,
               CASE WHEN a.id IS NOT NULL THEN 'Present' ELSE 'No-show' END AS status,
               a.checked_in_at, a.method
        FROM registrations r
        JOIN events e ON e.id = r.event_id
        JOIN users u ON u.id = r.user_id
        LEFT JOIN attendance a ON a.event_id = r.event_id AND a.user_id = r.user_id
        WHERE e.club_id = ?
          AND e.status = 'published'
          AND e.starts_at >= ?
          AND e.ends_at <= ?
          AND r.status = 'confirmed'
        ORDER BY e.starts_at, u.name
      `)
            .all(clubId, startsAfter, endsBefore);
    },
    findByUserWithEvents(userId, opts) {
        let sql = `
      SELECT e.title AS event_title, e.starts_at AS event_date, a.checked_in_at, a.method
      FROM attendance a
      JOIN events e ON e.id = a.event_id
      WHERE a.user_id = ?
    `;
        const params = [userId];
        if (opts.semesterStartsAt && opts.semesterEndsAt) {
            sql += ' AND e.starts_at >= ? AND e.starts_at <= ?';
            params.push(opts.semesterStartsAt, opts.semesterEndsAt);
        }
        sql += ' ORDER BY e.starts_at DESC';
        return database_1.db.prepare(sql).all(...params);
    },
};
//# sourceMappingURL=attendance.model.js.map