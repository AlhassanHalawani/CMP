"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notify = notify;
exports.notifyRole = notifyRole;
const notification_model_1 = require("../models/notification.model");
const email_service_1 = require("./email.service");
const user_model_1 = require("../models/user.model");
const database_1 = require("../config/database");
async function notify(opts) {
    const { userId, eventType, title, body, type = 'info', targetUrl } = opts;
    // In-app: default enabled (null = no preference row = enabled)
    const inAppPref = getPreference(userId, eventType, 'in_app');
    if (inAppPref !== false) {
        notification_model_1.NotificationModel.create({ user_id: userId, title, body, type, target_url: targetUrl ?? null });
    }
    // Email: default disabled (null = no preference row = disabled)
    const emailPref = getPreference(userId, eventType, 'email');
    if (emailPref === true) {
        const user = user_model_1.UserModel.findById(userId);
        if (user?.email) {
            await (0, email_service_1.sendEmail)({ to: user.email, subject: title, html: `<p>${body}</p>` });
        }
    }
}
// Notify all users with a given role
async function notifyRole(role, opts) {
    const users = user_model_1.UserModel.list({ role });
    for (const user of users) {
        await notify({ ...opts, userId: user.id });
    }
}
function getPreference(userId, eventType, channel) {
    const row = database_1.db
        .prepare('SELECT enabled FROM notification_preferences WHERE user_id=? AND event_type=? AND channel=?')
        .get(userId, eventType, channel);
    return row ? row.enabled === 1 : null;
}
//# sourceMappingURL=notifications.service.js.map