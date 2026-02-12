import { db } from '../config/database';

export interface Event {
  id: number;
  club_id: number;
  title: string;
  title_ar: string;
  description: string | null;
  description_ar: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number | null;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  created_by: number | null;
  created_at: string;
}

export const EventModel = {
  findById(id: number): Event | undefined {
    return db.prepare('SELECT * FROM events WHERE id = ?').get(id) as Event | undefined;
  },

  listByClub(clubId: number): Event[] {
    return db.prepare('SELECT * FROM events WHERE club_id = ? ORDER BY starts_at DESC').all(clubId) as Event[];
  },

  listUpcoming(limit = 10): Event[] {
    return db
      .prepare(
        "SELECT * FROM events WHERE status = 'published' AND starts_at > datetime('now') ORDER BY starts_at ASC LIMIT ?"
      )
      .all(limit) as Event[];
  },

  list(params?: { status?: string; clubId?: number; limit?: number; offset?: number }): Event[] {
    let sql = 'SELECT * FROM events';
    const conditions: string[] = [];
    const values: any[] = [];

    if (params?.status) {
      conditions.push('status = ?');
      values.push(params.status);
    }
    if (params?.clubId) {
      conditions.push('club_id = ?');
      values.push(params.clubId);
    }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY starts_at DESC';
    if (params?.limit) {
      sql += ' LIMIT ?';
      values.push(params.limit);
    }
    if (params?.offset) {
      sql += ' OFFSET ?';
      values.push(params.offset);
    }
    return db.prepare(sql).all(...values) as Event[];
  },

  create(data: Omit<Event, 'id' | 'created_at'>): Event {
    const result = db
      .prepare(
        `INSERT INTO events (club_id, title, title_ar, description, description_ar, location, starts_at, ends_at, capacity, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.club_id,
        data.title,
        data.title_ar,
        data.description,
        data.description_ar,
        data.location,
        data.starts_at,
        data.ends_at,
        data.capacity,
        data.status,
        data.created_by
      );
    return EventModel.findById(result.lastInsertRowid as number)!;
  },

  update(id: number, data: Partial<Omit<Event, 'id' | 'created_at'>>): Event | undefined {
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    if (fields.length === 0) return EventModel.findById(id);
    values.push(id);
    db.prepare(`UPDATE events SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return EventModel.findById(id);
  },

  delete(id: number): boolean {
    const result = db.prepare('DELETE FROM events WHERE id = ?').run(id);
    return result.changes > 0;
  },

  count(params?: { clubId?: number; status?: string }): number {
    let sql = 'SELECT COUNT(*) as count FROM events';
    const conditions: string[] = [];
    const values: any[] = [];
    if (params?.clubId) {
      conditions.push('club_id = ?');
      values.push(params.clubId);
    }
    if (params?.status) {
      conditions.push('status = ?');
      values.push(params.status);
    }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    return (db.prepare(sql).get(...values) as any).count;
  },
};
