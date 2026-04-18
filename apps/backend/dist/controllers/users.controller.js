"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = getMe;
exports.recordLoginActivity = recordLoginActivity;
exports.updateMe = updateMe;
exports.getGamification = getGamification;
exports.getXpHistory = getXpHistory;
exports.listUsers = listUsers;
exports.updateUserRole = updateUserRole;
const user_model_1 = require("../models/user.model");
const audit_service_1 = require("../services/audit.service");
const keycloakAdmin_service_1 = require("../services/keycloakAdmin.service");
const logger_1 = require("../utils/logger");
const database_1 = require("../config/database");
const achievement_engine_service_1 = require("../services/achievement-engine.service");
const gamification_service_1 = require("../services/gamification.service");
const notifications_service_1 = require("../services/notifications.service");
function getMe(req, res) {
    res.json(req.user);
}
function recordLoginActivity(req, res) {
    const userId = req.user.id;
    const today = new Date().toISOString().slice(0, 10);
    const insertResult = database_1.db
        .prepare(`INSERT OR IGNORE INTO user_login_activity (user_id, login_date) VALUES (?, ?)`)
        .run(userId, today);
    const newUnlocks = (0, achievement_engine_service_1.evaluateStudentAchievements)(userId);
    let xpResult = null;
    if (insertResult.changes > 0) {
        // New login day — award XP once
        xpResult = (0, gamification_service_1.awardXp)({
            userId,
            actionKey: 'daily_login',
            referenceKey: `login:${userId}:${today}`,
        });
        if (xpResult?.level_up) {
            (0, notifications_service_1.notify)({
                userId,
                eventType: 'level_up',
                title: 'Level Up!',
                body: `You reached Level ${xpResult.new_level}. Keep it up!`,
                type: 'success',
                targetUrl: '/profile',
            }).catch(() => { });
        }
    }
    res.json({
        date: today,
        xp_awarded: xpResult?.xp_awarded ?? 0,
        new_unlocks: newUnlocks,
        level_up: xpResult?.level_up ?? false,
        new_level: xpResult?.new_level ?? null,
        gamification: xpResult?.progress ?? null,
    });
}
function updateMe(req, res) {
    const { name, avatar_url } = req.body;
    const userId = req.user.id;
    user_model_1.UserModel.updateProfile(userId, { name, avatar_url });
    const updated = user_model_1.UserModel.findById(userId);
    // Award profile-completion XP once if the profile is now complete for the first time
    if (!updated.profile_completed_at && updated.name && updated.avatar_url) {
        database_1.db.prepare(`UPDATE users SET profile_completed_at = datetime('now') WHERE id = ?`).run(userId);
        const xpResult = (0, gamification_service_1.awardXp)({
            userId,
            actionKey: 'profile_completed',
            referenceKey: `profile:${userId}`,
            sourceType: 'user',
            sourceId: userId,
        });
        if (xpResult?.level_up) {
            (0, notifications_service_1.notify)({
                userId,
                eventType: 'level_up',
                title: 'Level Up!',
                body: `You reached Level ${xpResult.new_level}. Keep it up!`,
                type: 'success',
                targetUrl: '/profile',
            }).catch(() => { });
        }
    }
    res.json(user_model_1.UserModel.findById(userId));
}
function getGamification(req, res) {
    const userId = req.user.id;
    const user = user_model_1.UserModel.findById(userId);
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    const progress = (0, gamification_service_1.getLevelProgress)(user.xp_total);
    const recentActions = database_1.db
        .prepare(`SELECT action_key, xp_delta, source_type, source_id, created_at
       FROM xp_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 10`)
        .all(userId);
    res.json({ ...progress, recent_actions: recentActions });
}
function getXpHistory(req, res) {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const rows = database_1.db
        .prepare(`SELECT action_key, xp_delta, source_type, source_id, reference_key, created_at
       FROM xp_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`)
        .all(userId, limit);
    res.json({ data: rows, total: database_1.db.prepare('SELECT COUNT(*) as c FROM xp_transactions WHERE user_id = ?').get(userId).c });
}
function listUsers(req, res) {
    const role = req.query.role;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const users = user_model_1.UserModel.list({ role, limit, offset });
    const total = user_model_1.UserModel.count();
    res.json({ data: users, total });
}
async function updateUserRole(req, res) {
    const id = parseInt(req.params.id);
    const { role } = req.body;
    const user = user_model_1.UserModel.findById(id);
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    const previousRole = user.role;
    user_model_1.UserModel.updateRole(id, role);
    (0, audit_service_1.logAction)({ actorId: req.user.id, action: 'update_role', entityType: 'user', entityId: id, payload: { role } });
    // Sync to Keycloak so the next token refresh reflects the new role.
    // Best-effort: a sync failure does not roll back the DB change.
    (0, keycloakAdmin_service_1.syncUserRealmRole)(user.keycloak_id, role, previousRole).catch((err) => {
        logger_1.logger.warn(`Keycloak role sync failed for user ${id}: ${err.message}`);
    });
    res.json(user_model_1.UserModel.findById(id));
}
//# sourceMappingURL=users.controller.js.map