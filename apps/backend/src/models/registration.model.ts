import { db } from '../config/database';

export interface Registration {
  id: number;
  event_id: number;
  user_id: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  registered_at: string;
}

export const RegistrationModel = {
  findById(id: number): Registration | undefined {
    return db.prepare('SELECT * FROM registrations WHERE id = ?').get(id) as Registration | undefined;
  },

  findByEventAndUser(eventId: number, userId: number): Registration | undefined {
    return db
      .prepare('SELECT * FROM registrations WHERE event_id = ? AND user_id = ?')
      .get(eventId, userId) as Registration | undefined;
  },

  findByEvent(eventId: number): Registration[] {
    return db
      .prepare('SELECT * FROM registrations WHERE event_id = ? ORDER BY registered_at DESC')
      .all(eventId) as Registration[];
  },

  findByUser(userId: number): Registration[] {
    return db
      .prepare('SELECT * FROM registrations WHERE user_id = ? ORDER BY registered_at DESC')
      .all(userId) as Registration[];
  },

  create(data: { event_id: number; user_id: number; status?: string }): Registration {
    const result = db
      .prepare('INSERT INTO registrations (event_id, user_id, status) VALUES (?, ?, ?)')
      .run(data.event_id, data.user_id, data.status || 'confirmed');
    return RegistrationModel.findById(result.lastInsertRowid as number)!;
  },

  updateStatus(id: number, status: Registration['status']): void {
    db.prepare('UPDATE registrations SET status = ? WHERE id = ?').run(status, id);
  },

  countByEvent(eventId: number): number {
    return (
      db
        .prepare("SELECT COUNT(*) as count FROM registrations WHERE event_id = ? AND status != 'cancelled'")
        .get(eventId) as any
    ).count;
  },
};
