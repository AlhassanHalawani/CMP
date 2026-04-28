import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { db } from '../config/database';

export function getFeedEvents(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  // Events from clubs the user follows
  const followedEvents = db
    .prepare(
      `SELECT e.*, c.name AS club_name, c.name_ar AS club_name_ar, c.logo_url AS club_logo_url,
              'followed' AS source
       FROM events e
       JOIN clubs c ON c.id = e.club_id
       JOIN club_followers cf ON cf.club_id = e.club_id AND cf.user_id = ?
       WHERE e.status = 'published'
         AND e.starts_at >= datetime('now')
       ORDER BY e.starts_at ASC`
    )
    .all(userId);

  // Events from clubs where the user is an active member (may overlap with followed)
  const memberEvents = db
    .prepare(
      `SELECT e.*, c.name AS club_name, c.name_ar AS club_name_ar, c.logo_url AS club_logo_url,
              'member' AS source
       FROM events e
       JOIN clubs c ON c.id = e.club_id
       JOIN memberships m ON m.club_id = e.club_id AND m.user_id = ? AND m.status = 'active'
       WHERE e.status = 'published'
         AND e.starts_at >= datetime('now')
       ORDER BY e.starts_at ASC`
    )
    .all(userId);

  // Merge, deduplicate by event id, prefer 'member' source when both apply
  const seen = new Map<number, any>();
  for (const ev of memberEvents) {
    seen.set((ev as any).id, ev);
  }
  for (const ev of followedEvents) {
    if (!seen.has((ev as any).id)) {
      seen.set((ev as any).id, ev);
    }
  }

  const all = [...seen.values()].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );

  const total = all.length;
  const data = all.slice(offset, offset + limit);

  res.json({ data, total, limit, offset });
}
