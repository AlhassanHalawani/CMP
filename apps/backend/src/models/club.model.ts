import { db } from '../config/database';

export interface Club {
  id: number;
  name: string;
  name_ar: string;
  description: string | null;
  description_ar: string | null;
  logo_url: string | null;
  leader_id: number | null;
  created_at: string;
}

export const ClubModel = {
  findById(id: number): Club | undefined {
    return db.prepare('SELECT * FROM clubs WHERE id = ?').get(id) as Club | undefined;
  },

  list(params?: { limit?: number; offset?: number }): Club[] {
    let sql = 'SELECT * FROM clubs ORDER BY created_at DESC';
    const values: any[] = [];
    if (params?.limit) {
      sql += ' LIMIT ?';
      values.push(params.limit);
    }
    if (params?.offset) {
      sql += ' OFFSET ?';
      values.push(params.offset);
    }
    return db.prepare(sql).all(...values) as Club[];
  },

  create(data: Omit<Club, 'id' | 'created_at'>): Club {
    const result = db
      .prepare(
        'INSERT INTO clubs (name, name_ar, description, description_ar, logo_url, leader_id) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(data.name, data.name_ar, data.description, data.description_ar, data.logo_url, data.leader_id);
    return ClubModel.findById(result.lastInsertRowid as number)!;
  },

  update(id: number, data: Partial<Omit<Club, 'id' | 'created_at'>>): Club | undefined {
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    if (fields.length === 0) return ClubModel.findById(id);
    values.push(id);
    db.prepare(`UPDATE clubs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return ClubModel.findById(id);
  },

  delete(id: number): boolean {
    const result = db.prepare('DELETE FROM clubs WHERE id = ?').run(id);
    return result.changes > 0;
  },

  count(): number {
    return (db.prepare('SELECT COUNT(*) as count FROM clubs').get() as any).count;
  },
};
