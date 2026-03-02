"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startEventReminderJob = startEventReminderJob;
const node_cron_1 = __importDefault(require("node-cron"));
const database_1 = require("../config/database");
const notifications_service_1 = require("../services/notifications.service");
const logger_1 = require("../utils/logger");
// Runs every hour — sends reminders to registered students for events starting in ~24h
function startEventReminderJob() {
    node_cron_1.default.schedule('0 * * * *', async () => {
        logger_1.logger.info('Running event reminder job');
        try {
            const upcoming = database_1.db
                .prepare(`SELECT e.id, e.title, e.starts_at, r.user_id
           FROM events e
           JOIN registrations r ON r.event_id = e.id AND r.status = 'confirmed'
           WHERE e.status = 'published'
             AND e.starts_at > datetime('now', '+23 hours')
             AND e.starts_at < datetime('now', '+25 hours')
             AND NOT EXISTS (
               SELECT 1 FROM notifications n
               WHERE n.user_id = r.user_id
                 AND n.title LIKE 'Reminder:%'
                 AND n.body LIKE '%event_id:' || e.id || '%'
             )`)
                .all();
            for (const row of upcoming) {
                await (0, notifications_service_1.notify)({
                    userId: row.user_id,
                    eventType: 'event_reminder',
                    title: `Reminder: ${row.title}`,
                    body: `Event "${row.title}" starts at ${row.starts_at}. Don't forget to attend! event_id:${row.id}`,
                    type: 'info',
                });
            }
            if (upcoming.length > 0) {
                logger_1.logger.info(`Event reminder job sent ${upcoming.length} reminder(s)`);
            }
        }
        catch (err) {
            logger_1.logger.error('Event reminder job failed', { error: err.message });
        }
    });
}
//# sourceMappingURL=event-reminders.job.js.map