"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.markRead = markRead;
exports.markAllRead = markAllRead;
exports.getPreferences = getPreferences;
exports.updatePreference = updatePreference;
const notification_model_1 = require("../models/notification.model");
const database_1 = require("../config/database");
const VALID_EVENT_TYPES = [
    'event_reminder',
    'registration_confirmed',
    'event_approved',
    'event_rejected',
    'event_submitted',
];
const VALID_CHANNELS = ['in_app', 'email'];
function list(req, res) {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const notifications = notification_model_1.NotificationModel.listForUser(req.user.id, { limit, offset });
    const unread = notification_model_1.NotificationModel.countUnread(req.user.id);
    res.json({ data: notifications, unread });
}
function markRead(req, res) {
    const id = parseInt(req.params.id);
    notification_model_1.NotificationModel.markRead(id, req.user.id);
    res.json({ message: 'Marked as read' });
}
function markAllRead(req, res) {
    notification_model_1.NotificationModel.markAllRead(req.user.id);
    res.json({ message: 'All marked as read' });
}
function getPreferences(req, res) {
    const rows = database_1.db
        .prepare('SELECT event_type, channel, enabled FROM notification_preferences WHERE user_id = ?')
        .all(req.user.id);
    res.json(rows);
}
function updatePreference(req, res) {
    const { event_type, channel, enabled } = req.body;
    if (!VALID_EVENT_TYPES.includes(event_type)) {
        res.status(400).json({ error: 'Invalid event_type' });
        return;
    }
    if (!VALID_CHANNELS.includes(channel)) {
        res.status(400).json({ error: 'Invalid channel' });
        return;
    }
    if (typeof enabled !== 'boolean') {
        res.status(400).json({ error: 'enabled must be a boolean' });
        return;
    }
    database_1.db.prepare(`INSERT INTO notification_preferences (user_id, event_type, channel, enabled)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, event_type, channel) DO UPDATE SET enabled = excluded.enabled`).run(req.user.id, event_type, channel, enabled ? 1 : 0);
    res.json({ message: 'Preference saved' });
}
//# sourceMappingURL=notifications.controller.js.map