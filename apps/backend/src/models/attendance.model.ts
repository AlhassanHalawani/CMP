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

  findPresentWithUsers(eventId: number): Array<{
    name: string;
    email: string;
    checked_in_at: string;
    method: 'qr' | 'manual';
  }> {
    return db
      .prepare(`
        SELECT u.name, u.email, a.checked_in_at, a.method
        FROM attendance a
        JOIN users u ON u.id = a.user_id
        WHERE a.event_id = ?
        ORDER BY a.checked_in_at
      `)
      .all(eventId) as any[];
  },

  findNoShowsWithUsers(eventId: number): Array<{
    name: string;
    email: string;
    registered_at: string;
  }> {
    return db
      .prepare(`
        SELECT u.name, u.email, r.registered_at
        FROM registrations r
        JOIN users u ON u.id = r.user_id
        LEFT JOIN attendance a ON a.event_id = r.event_id AND a.user_id = r.user_id
        WHERE r.event_id = ? AND r.status = 'confirmed' AND a.id IS NULL
        ORDER BY u.name
      `)
      .all(eventId) as any[];
  },

  findClubReport(clubId: number, startsAfter: string, endsBefore: string): Array<{
    event_title: string;
    event_starts_at: string;
    name: string;
    email: string;
    status: 'Present' | 'No-show';
    checked_in_at: string | null;
    method: string | null;
  }> {
    return db
      .prepare(`
        SELECT e.title AS event_title, e.starts_at AS event_starts_at,
               u.name, u.email,
               CASE WHEN a.id IS NOT NULL THEN 'Present' ELSE 'No-show' END AS status,
               a.checked_in_at, a.method
        FROM registrations r
        JOIN events e ON e.id = r.event_id
        JOIN users u ON u.id = r.user_id
        LEFT JOIN attendance a ON a.event_id = r.event_id AND a.user_id = r.user_id
        WHERE e.club_id = ?
          AND e.status = 'published'
          AND e.starts_at >= ?
          AND e.ends_at <= ?
          AND r.status = 'confirmed'
        ORDER BY e.starts_at, u.name
      `)
      .all(clubId, startsAfter, endsBefore) as any[];
  },

  findByUserWithEvents(userId: number, opts: { semesterStartsAt?: string; semesterEndsAt?: string }): Array<{
    event_title: string;
    event_date: string;
    checked_in_at: string;
    method: 'qr' | 'manual';
  }> {
    let sql = `
      SELECT e.title AS event_title, e.starts_at AS event_date, a.checked_in_at, a.method
      FROM attendance a
      JOIN events e ON e.id = a.event_id
      WHERE a.user_id = ?
    `;
    const params: any[] = [userId];
    if (opts.semesterStartsAt && opts.semesterEndsAt) {
      sql += ' AND e.starts_at >= ? AND e.starts_at <= ?';
      params.push(opts.semesterStartsAt, opts.semesterEndsAt);
    }
    sql += ' ORDER BY e.starts_at DESC';
    return db.prepare(sql).all(...params) as any[];
  },
};
