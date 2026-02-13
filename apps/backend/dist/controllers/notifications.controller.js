"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.markRead = markRead;
exports.markAllRead = markAllRead;
const notification_model_1 = require("../models/notification.model");
function list(req, res) {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const notifications = notification_model_1.NotificationModel.listForUser(req.user.id, { limit, offset });
    const unread = notification_model_1.NotificationModel.countUnread(req.user.id);
    res.json({ data: notifications, unread });
}
function markRead(req, res) {
    const id = parseInt(req.params.id);
    notification_model_1.NotificationModel.markRead(id);
    res.json({ message: 'Marked as read' });
}
function markAllRead(req, res) {
    notification_model_1.NotificationModel.markAllRead(req.user.id);
    res.json({ message: 'All marked as read' });
}
//# sourceMappingURL=notifications.controller.js.map