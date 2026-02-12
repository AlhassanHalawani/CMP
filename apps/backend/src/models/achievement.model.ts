import { db } from '../config/database';

export interface Achievement {
  id: number;
  user_id: number;
  club_id: number;
  title: string;
  title_ar: string;
  description: string | null;
  description_ar: string | null;
  awarded_at: string;
  semester_id: number | null;
}

export const AchievementModel = {
  findById(id: number): Achievement | undefined {
    return db.prepare('SELECT * FROM achievements WHERE id = ?').get(id) as Achievement | undefined;
  },

  findByUser(userId: number): Achievement[] {
    return db
      .prepare('SELECT * FROM achievements WHERE user_id = ? ORDER BY awarded_at DESC')
      .all(userId) as Achievement[];
  },

  findByClub(clubId: number): Achievement[] {
    return db
      .prepare('SELECT * FROM achievements WHERE club_id = ? ORDER BY awarded_at DESC')
      .all(clubId) as Achievement[];
  },

  create(data: Omit<Achievement, 'id' | 'awarded_at'>): Achievement {
    const result = db
      .prepare(
        'INSERT INTO achievements (user_id, club_id, title, title_ar, description, description_ar, semester_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        data.user_id,
        data.club_id,
        data.title,
        data.title_ar,
        data.description,
        data.description_ar,
        data.semester_id
      );
    return AchievementModel.findById(result.lastInsertRowid as number)!;
  },

  delete(id: number): boolean {
    const result = db.prepare('DELETE FROM achievements WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
