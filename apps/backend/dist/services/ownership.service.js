"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = isAdmin;
exports.leaderOwnsClub = leaderOwnsClub;
exports.leaderOwnsEvent = leaderOwnsEvent;
exports.getLeaderClubIds = getLeaderClubIds;
exports.canManageClub = canManageClub;
exports.canManageEvent = canManageEvent;
const database_1 = require("../config/database");
function isAdmin(user) {
    return user.role === 'admin';
}
/**
 * Returns true if the user (by id) is set as leader_id of the given club.
 */
function leaderOwnsClub(userId, clubId) {
    const row = database_1.db
        .prepare('SELECT leader_id FROM clubs WHERE id = ?')
        .get(clubId);
    return row !== undefined && row.leader_id === userId;
}
/**
 * Returns true if the user (by id) is the leader of the club that owns the event.
 * Ownership is determined by events -> clubs.leader_id, NOT events.created_by.
 */
function leaderOwnsEvent(userId, eventId) {
    const row = database_1.db
        .prepare('SELECT clubs.leader_id FROM events JOIN clubs ON events.club_id = clubs.id WHERE events.id = ?')
        .get(eventId);
    return row !== undefined && row.leader_id === userId;
}
/**
 * Returns all club IDs that the user leads.
 */
function getLeaderClubIds(userId) {
    const rows = database_1.db.prepare('SELECT id FROM clubs WHERE leader_id = ?').all(userId);
    return rows.map((r) => r.id);
}
/**
 * Returns true if the user can manage the club (admin bypass or owns it).
 */
function canManageClub(user, clubId) {
    return isAdmin(user) || leaderOwnsClub(user.id, clubId);
}
/**
 * Returns true if the user can manage the event (admin bypass or owns it via club).
 */
function canManageEvent(user, eventId) {
    return isAdmin(user) || leaderOwnsEvent(user.id, eventId);
}
//# sourceMappingURL=ownership.service.js.map