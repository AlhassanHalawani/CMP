import { NotificationModel } from '../models/notification.model';
import { sendEmail } from './email.service';
import { UserModel } from '../models/user.model';
import { db } from '../config/database';

type NotifType = 'info' | 'success' | 'warning' | 'error';

interface NotifyOptions {
  userId: number;
  eventType: string;
  title: string;
  body: string;
  type?: NotifType;
  targetUrl?: string | null;
  actionsJson?: Record<string, unknown> | null;
}

export async function notify(opts: NotifyOptions): Promise<void> {
  const { userId, eventType, title, body, type = 'info', targetUrl, actionsJson } = opts;

  // In-app: default enabled (null = no preference row = enabled)
  const inAppPref = getPreference(userId, eventType, 'in_app');
  if (inAppPref !== false) {
    NotificationModel.create({
      user_id: userId,
      title,
      body,
      type,
      target_url: targetUrl ?? null,
      actions_json: actionsJson ?? null,
    });
  }

  // Email: default disabled (null = no preference row = disabled)
  const emailPref = getPreference(userId, eventType, 'email');
  if (emailPref === true) {
    const user = UserModel.findById(userId);
    if (user?.email) {
      await sendEmail({ to: user.email, subject: title, html: `<p>${body}</p>` });
    }
  }
}

// Notify all users with a given role
export async function notifyRole(role: string, opts: Omit<NotifyOptions, 'userId'>): Promise<void> {
  const users = UserModel.list({ role });
  for (const user of users) {
    await notify({ ...opts, userId: user.id });
  }
}

function getPreference(userId: number, eventType: string, channel: string): boolean | null {
  const row = db
    .prepare('SELECT enabled FROM notification_preferences WHERE user_id=? AND event_type=? AND channel=?')
    .get(userId, eventType, channel) as { enabled: number } | undefined;
  return row ? row.enabled === 1 : null;
}
