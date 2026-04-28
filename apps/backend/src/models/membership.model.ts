import { db } from '../config/database';

export interface Membership {
  id: number;
  club_id: number;
  user_id: number;
  status: 'pending' | 'active' | 'inactive';
  primary_role: string | null;
  role_notes: string | null;
  approved_at: string | null;
  approved_by: number | null;
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

  findById(id: number): Membership | undefined {
    return db.prepare('SELECT * FROM memberships WHERE id = ?').get(id) as Membership | undefined;
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

  approve(id: number, approvedBy: number): Membership {
    db.prepare(
      "UPDATE memberships SET status = 'active', approved_at = datetime('now'), approved_by = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(approvedBy, id);
    return db.prepare('SELECT * FROM memberships WHERE id = ?').get(id) as Membership;
  },

  updateRole(id: number, primaryRole: string | null, roleNotes?: string): Membership {
    db.prepare(
      "UPDATE memberships SET primary_role = ?, role_notes = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(primaryRole, roleNotes ?? null, id);
    return db.prepare('SELECT * FROM memberships WHERE id = ?').get(id) as Membership;
  },

  listActiveAssignableMembers(clubId: number): MembershipWithUser[] {
    return db
      .prepare(
        `SELECT m.*, u.name, u.email, u.avatar_url
         FROM memberships m
         JOIN users u ON u.id = m.user_id
         WHERE m.club_id = ? AND m.status = 'active'
         ORDER BY u.name ASC`
      )
      .all(clubId) as MembershipWithUser[];
  },

  countActive(clubId: number): number {
    return (
      db
        .prepare("SELECT COUNT(*) as count FROM memberships WHERE club_id = ? AND status = 'active'")
        .get(clubId) as any
    ).count;
  },
};
