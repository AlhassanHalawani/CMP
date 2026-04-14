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
  status: 'draft' | 'submitted' | 'published' | 'rejected' | 'cancelled' | 'completed';
  rejection_notes: string | null;
  members_only: number;
  delivery_mode: 'physical' | 'online';
  created_by: number | null;
  created_at: string;
  checkin_open: number;       // 0 | 1
  checkin_finalized: number;  // 0 | 1
  category: string | null;
  registration_count?: number; // computed via subquery
}

const REG_COUNT_SQL = `(SELECT COUNT(*) FROM registrations WHERE event_id = events.id AND status != 'cancelled') AS registration_count`;

export const EventModel = {
  findById(id: number): Event | undefined {
    return db
      .prepare(`SELECT *, ${REG_COUNT_SQL} FROM events WHERE id = ?`)
      .get(id) as Event | undefined;
  },

  listByClub(clubId: number): Event[] {
    return db
      .prepare(`SELECT *, ${REG_COUNT_SQL} FROM events WHERE club_id = ? ORDER BY starts_at DESC`)
      .all(clubId) as Event[];
  },

  listUpcoming(limit = 10): Event[] {
    return db
      .prepare(
        `SELECT *, ${REG_COUNT_SQL} FROM events WHERE status = 'published' AND starts_at > datetime('now') ORDER BY starts_at ASC LIMIT ?`
      )
      .all(limit) as Event[];
  },

  list(params?: {
    status?: string;
    clubId?: number;
    limit?: number;
    offset?: number;
    category?: string;
    location?: string;
    startsAfter?: string;
    endsBefore?: string;
    /** When set, returns published events PLUS any event belonging to these clubs (leader visibility) */
    leaderClubIds?: number[];
  }): Event[] {
    let sql = `SELECT *, ${REG_COUNT_SQL} FROM events`;
    const conditions: string[] = [];
    const values: any[] = [];

    if (params?.leaderClubIds && params.leaderClubIds.length > 0) {
      const placeholders = params.leaderClubIds.map(() => '?').join(', ');
      conditions.push(`(status = 'published' OR club_id IN (${placeholders}))`);
      values.push(...params.leaderClubIds);
    } else if (params?.status) {
      conditions.push('status = ?');
      values.push(params.status);
    }
    if (params?.clubId) {
      conditions.push('club_id = ?');
      values.push(params.clubId);
    }
    if (params?.category) {
      conditions.push('category = ?');
      values.push(params.category);
    }
    if (params?.location) {
      conditions.push('location LIKE ?');
      values.push(`%${params.location}%`);
    }
    if (params?.startsAfter) {
      conditions.push('starts_at >= ?');
      values.push(params.startsAfter);
    }
    if (params?.endsBefore) {
      conditions.push('starts_at <= ?');
      values.push(params.endsBefore);
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

  create(data: Omit<Event, 'id' | 'created_at' | 'registration_count'>): Event {
    const result = db
      .prepare(
        `INSERT INTO events (club_id, title, title_ar, description, description_ar, location, starts_at, ends_at, capacity, status, members_only, delivery_mode, created_by, category)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
        data.members_only ?? 0,
        data.delivery_mode ?? 'physical',
        data.created_by,
        data.category ?? null
      );
    return EventModel.findById(result.lastInsertRowid as number)!;
  },

  update(id: number, data: Partial<Omit<Event, 'id' | 'created_at' | 'registration_count'>>): Event | undefined {
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

  count(params?: {
    clubId?: number;
    status?: string;
    category?: string;
    location?: string;
    startsAfter?: string;
    endsBefore?: string;
    /** When set, counts published events PLUS any event belonging to these clubs (leader visibility) */
    leaderClubIds?: number[];
  }): number {
    let sql = 'SELECT COUNT(*) as count FROM events';
    const conditions: string[] = [];
    const values: any[] = [];
    if (params?.leaderClubIds && params.leaderClubIds.length > 0) {
      const placeholders = params.leaderClubIds.map(() => '?').join(', ');
      conditions.push(`(status = 'published' OR club_id IN (${placeholders}))`);
      values.push(...params.leaderClubIds);
    } else if (params?.status) {
      conditions.push('status = ?');
      values.push(params.status);
    }
    if (params?.clubId) {
      conditions.push('club_id = ?');
      values.push(params.clubId);
    }
    if (params?.category) {
      conditions.push('category = ?');
      values.push(params.category);
    }
    if (params?.location) {
      conditions.push('location LIKE ?');
      values.push(`%${params.location}%`);
    }
    if (params?.startsAfter) {
      conditions.push('starts_at >= ?');
      values.push(params.startsAfter);
    }
    if (params?.endsBefore) {
      conditions.push('starts_at <= ?');
      values.push(params.endsBefore);
    }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    return (db.prepare(sql).get(...values) as any).count;
  },

  listDistinctCategories(): string[] {
    return (
      db
        .prepare("SELECT DISTINCT category FROM events WHERE category IS NOT NULL AND category != '' ORDER BY category")
        .all() as { category: string }[]
    ).map((r) => r.category);
  },
};
