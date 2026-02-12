import { db } from '../config/database';

export interface Semester {
  id: number;
  name: string;
  starts_at: string;
  ends_at: string;
  is_active: number;
}

export const SemesterModel = {
  findById(id: number): Semester | undefined {
    return db.prepare('SELECT * FROM semesters WHERE id = ?').get(id) as Semester | undefined;
  },

  getActive(): Semester | undefined {
    return db.prepare('SELECT * FROM semesters WHERE is_active = 1').get() as Semester | undefined;
  },

  list(): Semester[] {
    return db.prepare('SELECT * FROM semesters ORDER BY starts_at DESC').all() as Semester[];
  },

  create(data: { name: string; starts_at: string; ends_at: string }): Semester {
    const result = db
      .prepare('INSERT INTO semesters (name, starts_at, ends_at) VALUES (?, ?, ?)')
      .run(data.name, data.starts_at, data.ends_at);
    return SemesterModel.findById(result.lastInsertRowid as number)!;
  },

  setActive(id: number): void {
    const txn = db.transaction(() => {
      db.prepare('UPDATE semesters SET is_active = 0').run();
      db.prepare('UPDATE semesters SET is_active = 1 WHERE id = ?').run(id);
    });
    txn();
  },

  delete(id: number): boolean {
    const result = db.prepare('DELETE FROM semesters WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
