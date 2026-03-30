import { db } from '../config/database';
import { User } from '../models/user.model';

export function isAdmin(user: User): boolean {
  return user.role === 'admin';
}

/**
 * Returns true if the user (by id) is set as leader_id of the given club.
 */
export function leaderOwnsClub(userId: number, clubId: number): boolean {
  const row = db
    .prepare('SELECT leader_id FROM clubs WHERE id = ?')
    .get(clubId) as { leader_id: number | null } | undefined;
  return row !== undefined && row.leader_id === userId;
}

/**
 * Returns true if the user (by id) is the leader of the club that owns the event.
 * Ownership is determined by events -> clubs.leader_id, NOT events.created_by.
 */
export function leaderOwnsEvent(userId: number, eventId: number): boolean {
  const row = db
    .prepare(
      'SELECT clubs.leader_id FROM events JOIN clubs ON events.club_id = clubs.id WHERE events.id = ?'
    )
    .get(eventId) as { leader_id: number | null } | undefined;
  return row !== undefined && row.leader_id === userId;
}

/**
 * Returns all club IDs that the user leads.
 */
export function getLeaderClubIds(userId: number): number[] {
  const rows = db.prepare('SELECT id FROM clubs WHERE leader_id = ?').all(userId) as { id: number }[];
  return rows.map((r) => r.id);
}

/**
 * Returns true if the user can manage the club (admin bypass or owns it).
 */
export function canManageClub(user: User, clubId: number): boolean {
  return isAdmin(user) || leaderOwnsClub(user.id, clubId);
}

/**
 * Returns true if the user can manage the event (admin bypass or owns it via club).
 */
export function canManageEvent(user: User, eventId: number): boolean {
  return isAdmin(user) || leaderOwnsEvent(user.id, eventId);
}
