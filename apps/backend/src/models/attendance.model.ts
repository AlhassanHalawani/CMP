import { db } from '../config/database';
import crypto from 'crypto';

export interface Attendance {
  id: number;
  event_id: number;
  user_id: number;
  checked_in_at: string;
  method: 'qr' | 'manual';
  qr_token: string | null;
}

export const AttendanceModel = {
  findByEvent(eventId: number): Attendance[] {
    return db
      .prepare('SELECT * FROM attendance WHERE event_id = ? ORDER BY checked_in_at DESC')
      .all(eventId) as Attendance[];
  },

  findByEventAndUser(eventId: number, userId: number): Attendance | undefined {
    return db
      .prepare('SELECT * FROM attendance WHERE event_id = ? AND user_id = ?')
      .get(eventId, userId) as Attendance | undefined;
  },

  checkIn(data: { event_id: number; user_id: number; method: 'qr' | 'manual'; qr_token?: string }): Attendance {
    const result = db
      .prepare('INSERT INTO attendance (event_id, user_id, method, qr_token) VALUES (?, ?, ?, ?)')
      .run(data.event_id, data.user_id, data.method, data.qr_token || null);
    return db.prepare('SELECT * FROM attendance WHERE id = ?').get(result.lastInsertRowid) as Attendance;
  },

  generateQrToken(eventId: number): string {
    const token = crypto.randomBytes(32).toString('hex');
    return `${eventId}:${token}`;
  },

  verifyQrToken(token: string): { eventId: number; token: string } | null {
    const parts = token.split(':');
    if (parts.length !== 2) return null;
    const eventId = parseInt(parts[0], 10);
    if (isNaN(eventId)) return null;
    return { eventId, token: parts[1] };
  },

  countByEvent(eventId: number): number {
    return (db.prepare('SELECT COUNT(*) as count FROM attendance WHERE event_id = ?').get(eventId) as any).count;
  },
};
