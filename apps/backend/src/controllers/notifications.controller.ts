import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { NotificationModel } from '../models/notification.model';
import { db } from '../config/database';

const VALID_EVENT_TYPES = [
  'event_reminder',
  'registration_confirmed',
  'event_approved',
  'event_rejected',
  'event_submitted',
  'membership_requested',
  'membership_approved',
  'membership_declined',
];
const VALID_CHANNELS = ['in_app', 'email'] as const;

export function list(req: AuthRequest, res: Response) {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const notifications = NotificationModel.listForUser(req.user!.id, { limit, offset });
  const unread = NotificationModel.countUnread(req.user!.id);
  res.json({ data: notifications, unread });
}

export function markRead(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  NotificationModel.markRead(id, req.user!.id);
  res.json({ message: 'Marked as read' });
}

export function markAllRead(req: AuthRequest, res: Response) {
  NotificationModel.markAllRead(req.user!.id);
  res.json({ message: 'All marked as read' });
}

export function getPreferences(req: AuthRequest, res: Response) {
  const rows = db
    .prepare('SELECT event_type, channel, enabled FROM notification_preferences WHERE user_id = ?')
    .all(req.user!.id);
  res.json(rows);
}

export function updatePreference(req: AuthRequest, res: Response) {
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

  db.prepare(
    `INSERT INTO notification_preferences (user_id, event_type, channel, enabled)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, event_type, channel) DO UPDATE SET enabled = excluded.enabled`,
  ).run(req.user!.id, event_type, channel, enabled ? 1 : 0);

  res.json({ message: 'Preference saved' });
}
