import { User } from '../models/user.model';
export declare function isAdmin(user: User): boolean;
/**
 * Returns true if the user (by id) is set as leader_id of the given club.
 */
export declare function leaderOwnsClub(userId: number, clubId: number): boolean;
/**
 * Returns true if the user (by id) is the leader of the club that owns the event.
 * Ownership is determined by events -> clubs.leader_id, NOT events.created_by.
 */
export declare function leaderOwnsEvent(userId: number, eventId: number): boolean;
/**
 * Returns all club IDs that the user leads.
 */
export declare function getLeaderClubIds(userId: number): number[];
/**
 * Returns true if the user can manage the club (admin bypass or owns it).
 */
export declare function canManageClub(user: User, clubId: number): boolean;
/**
 * Returns true if the user can manage the event (admin bypass or owns it via club).
 */
export declare function canManageEvent(user: User, eventId: number): boolean;
