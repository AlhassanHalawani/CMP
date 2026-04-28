import { db } from '../config/database';

export interface ClubFollower {
  id: number;
  club_id: number;
  user_id: number;
  created_at: string;
  muted_at: string | null;
}

export interface ClubFollowerWithUser extends ClubFollower {
  name: string;
  email: string;
  avatar_url: string | null;
}

export const ClubFollowerModel = {
  findByClubAndUser(clubId: number, userId: number): ClubFollower | undefined {
    return db
      .prepare('SELECT * FROM club_followers WHERE club_id = ? AND user_id = ?')
      .get(clubId, userId) as ClubFollower | undefined;
  },

  follow(clubId: number, userId: number): ClubFollower {
    const result = db
      .prepare('INSERT INTO club_followers (club_id, user_id) VALUES (?, ?)')
      .run(clubId, userId);
    return db
      .prepare('SELECT * FROM club_followers WHERE id = ?')
      .get(result.lastInsertRowid) as ClubFollower;
  },

  unfollow(clubId: number, userId: number): boolean {
    const result = db
      .prepare('DELETE FROM club_followers WHERE club_id = ? AND user_id = ?')
      .run(clubId, userId);
    return result.changes > 0;
  },

  listByClub(clubId: number): ClubFollowerWithUser[] {
    return db
      .prepare(
        `SELECT cf.*, u.name, u.email, u.avatar_url
         FROM club_followers cf
         JOIN users u ON u.id = cf.user_id
         WHERE cf.club_id = ?
         ORDER BY cf.created_at DESC`
      )
      .all(clubId) as ClubFollowerWithUser[];
  },

  listByUser(userId: number): ClubFollower[] {
    return db
      .prepare('SELECT * FROM club_followers WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as ClubFollower[];
  },

  countByClub(clubId: number): number {
    return (
      db.prepare('SELECT COUNT(*) as count FROM club_followers WHERE club_id = ?').get(clubId) as any
    ).count;
  },

  newFollowersLast30Days(clubId: number): number {
    return (
      db
        .prepare(
          `SELECT COUNT(*) as count FROM club_followers
           WHERE club_id = ? AND created_at >= datetime('now', '-30 days')`
        )
        .get(clubId) as any
    ).count;
  },

  getFollowedClubIds(userId: number): number[] {
    const rows = db
      .prepare('SELECT club_id FROM club_followers WHERE user_id = ?')
      .all(userId) as { club_id: number }[];
    return rows.map((r) => r.club_id);
  },
};
