import cron from 'node-cron';
import { db } from '../config/database';
import { notify } from '../services/notifications.service';
import { logger } from '../utils/logger';

// Runs every hour — sends reminders to registered students for events starting in ~24h
export function startEventReminderJob() {
  cron.schedule('0 * * * *', async () => {
    logger.info('Running event reminder job');
    try {
      const upcoming = db
        .prepare(
          `SELECT e.id, e.title, e.starts_at, r.user_id
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
             )`
        )
        .all() as { id: number; title: string; starts_at: string; user_id: number }[];

      for (const row of upcoming) {
        await notify({
          userId: row.user_id,
          eventType: 'event_reminder',
          title: `Reminder: ${row.title}`,
          body: `Event "${row.title}" starts at ${row.starts_at}. Don't forget to attend! event_id:${row.id}`,
          type: 'info',
        });
      }

      if (upcoming.length > 0) {
        logger.info(`Event reminder job sent ${upcoming.length} reminder(s)`);
      }
    } catch (err) {
      logger.error('Event reminder job failed', { error: (err as Error).message });
    }
  });
}
