import { db } from '../config/database';

export interface Membership {
  id: number;
  club_id: number;
  user_id: number;
  status: 'pending' | 'active' | 'inactive';
  requested_at: string;
  updated_at: string;
}

export interface MembershipWithUser extends Membership {
  name: string;
  email: string;
  avatar_url: string | null;
}

export const MembershipModel = {
  findByClubAndUser(clubId: number, userId: number): Membership | undefined {
    return db
      .prepare('SELECT * FROM memberships WHERE club_id = ? AND user_id = ?')
      .get(clubId, userId) as Membership | undefined;
  },

  findByClub(clubId: number, status?: string): MembershipWithUser[] {
    if (status) {
      return db
        .prepare(
          `SELECT m.*, u.name, u.email, u.avatar_url
           FROM memberships m
           JOIN users u ON u.id = m.user_id
           WHERE m.club_id = ? AND m.status = ?
           ORDER BY m.requested_at DESC`
        )
        .all(clubId, status) as MembershipWithUser[];
    }
    return db
      .prepare(
        `SELECT m.*, u.name, u.email, u.avatar_url
         FROM memberships m
         JOIN users u ON u.id = m.user_id
         WHERE m.club_id = ?
         ORDER BY m.requested_at DESC`
      )
      .all(clubId) as MembershipWithUser[];
  },

  findByUser(userId: number): Membership[] {
    return db
      .prepare('SELECT * FROM memberships WHERE user_id = ? ORDER BY requested_at DESC')
      .all(userId) as Membership[];
  },

  create(clubId: number, userId: number): Membership {
    const result = db
      .prepare('INSERT INTO memberships (club_id, user_id, status) VALUES (?, ?, ?)')
      .run(clubId, userId, 'pending');
    return db
      .prepare('SELECT * FROM memberships WHERE id = ?')
      .get(result.lastInsertRowid) as Membership;
  },

  updateStatus(id: number, status: string): Membership {
    db.prepare("UPDATE memberships SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
    return db.prepare('SELECT * FROM memberships WHERE id = ?').get(id) as Membership;
  },

  countActive(clubId: number): number {
    return (
      db
        .prepare("SELECT COUNT(*) as count FROM memberships WHERE club_id = ? AND status = 'active'")
        .get(clubId) as any
    ).count;
  },
};
