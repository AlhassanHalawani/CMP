import { db } from '../config/database';

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  body: string | null;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: number;
  created_at: string;
}

export const NotificationModel = {
  create(data: { user_id: number; title: string; body?: string; type?: string }): Notification {
    const result = db
      .prepare('INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)')
      .run(data.user_id, data.title, data.body || null, data.type || 'info');
    return db.prepare('SELECT * FROM notifications WHERE id = ?').get(result.lastInsertRowid) as Notification;
  },

  listForUser(userId: number, params?: { limit?: number; offset?: number }): Notification[] {
    let sql = 'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC';
    const values: any[] = [userId];
    if (params?.limit) {
      sql += ' LIMIT ?';
      values.push(params.limit);
    }
    if (params?.offset) {
      sql += ' OFFSET ?';
      values.push(params.offset);
    }
    return db.prepare(sql).all(...values) as Notification[];
  },

  markRead(id: number): void {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
  },

  markAllRead(userId: number): void {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(userId);
  },

  countUnread(userId: number): number {
    return (
      db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(userId) as any
    ).count;
  },
};
