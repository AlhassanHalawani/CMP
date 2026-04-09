import path from 'path';
import fs from 'fs';
import { Request, Response } from 'express';
import multer from 'multer';
import { AuthRequest } from '../middleware/auth';
import { ClubModel } from '../models/club.model';
import { UserModel } from '../models/user.model';
import { db } from '../config/database';
import { logAction } from '../services/audit.service';
import { isAdmin, leaderOwnsClub } from '../services/ownership.service';
import { syncUserRealmRole } from '../services/keycloakAdmin.service';
import { logger } from '../utils/logger';

const uploadsDir = path.resolve('./data/uploads/logos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => cb(null, `club-${Date.now()}${path.extname(file.originalname)}`),
});

export const logoUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
    cb(null, true);
  },
});

export function listClubs(req: Request, res: Response) {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const clubs = ClubModel.list({ limit, offset });
  const total = ClubModel.count();
  res.json({ data: clubs, total });
}

export function getClub(req: Request, res: Response) {
  const club = ClubModel.findById(parseInt(req.params.id));
  if (!club) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }
  res.json(club);
}

export function createClub(req: AuthRequest, res: Response) {
  const { name, name_ar, description, description_ar, logo_url, leader_id } = req.body;
  const club = ClubModel.create({ name, name_ar, description, description_ar, logo_url, leader_id });
  logAction({ actorId: req.user!.id, action: 'create', entityType: 'club', entityId: club.id });
  res.status(201).json(club);
}

export function updateClub(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const user = req.user!;

  const existing = ClubModel.findById(id);
  if (!existing) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }

  // club_leader may only update their own club
  if (!isAdmin(user) && !leaderOwnsClub(user.id, id)) {
    res.status(403).json({ error: 'You do not have permission to update this club' });
    return;
  }

  // Only admin can change club leadership
  if (!isAdmin(user) && 'leader_id' in req.body) {
    res.status(403).json({ error: 'Only admins can change club leadership' });
    return;
  }

  const club = ClubModel.update(id, req.body);
  logAction({ actorId: user.id, action: 'update', entityType: 'club', entityId: id });
  res.json(club);
}

export function deleteClub(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const deleted = ClubModel.delete(id);
  if (!deleted) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }
  logAction({ actorId: req.user!.id, action: 'delete', entityType: 'club', entityId: id });
  res.status(204).send();
}

export function getClubStats(req: Request, res: Response) {
  const clubId = parseInt(req.params.id);

  const club = ClubModel.findById(clubId);
  if (!club) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }

  const { published_events } = db
    .prepare(`SELECT COUNT(*) AS published_events FROM events WHERE club_id = ? AND status = 'published'`)
    .get(clubId) as { published_events: number };

  const { total_attendance } = db
    .prepare(
      `SELECT COUNT(a.id) AS total_attendance
       FROM attendance a
       JOIN events e ON e.id = a.event_id
       WHERE e.club_id = ? AND e.status = 'published'`
    )
    .get(clubId) as { total_attendance: number };

  const { achievements_awarded } = db
    .prepare(`SELECT COUNT(*) AS achievements_awarded FROM achievements WHERE club_id = ?`)
    .get(clubId) as { achievements_awarded: number };

  const { active_members } = db
    .prepare(`SELECT COUNT(*) AS active_members FROM memberships WHERE club_id = ? AND status = 'active'`)
    .get(clubId) as { active_members: number };

  res.json({ published_events, total_attendance, achievements_awarded, active_members });
}

/**
 * POST /api/clubs/:id/assign-leader  (admin only)
 * Body: { user_id: number }
 * Atomically:
 *   1. Sets club.leader_id = user_id
 *   2. Promotes the new user to club_leader role
 *   3. Demotes the previous leader back to student if they no longer lead any club
 */
export function assignClubLeader(req: AuthRequest, res: Response) {
  const clubId = parseInt(req.params.id);
  const newLeaderId: number | undefined = req.body.user_id;

  if (!newLeaderId) {
    res.status(400).json({ error: 'user_id is required' });
    return;
  }

  const club = ClubModel.findById(clubId);
  if (!club) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }

  const newLeader = UserModel.findById(newLeaderId);
  if (!newLeader) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const previousLeaderId = club.leader_id;

  db.transaction(() => {
    // Assign the leader
    ClubModel.update(clubId, { leader_id: newLeaderId });
    // Promote new leader
    UserModel.updateRole(newLeaderId, 'club_leader');
    // Demote previous leader if they no longer lead any other club
    if (previousLeaderId && previousLeaderId !== newLeaderId) {
      const stillLeads = (db.prepare(
        'SELECT COUNT(*) as cnt FROM clubs WHERE leader_id = ? AND id != ?'
      ).get(previousLeaderId, clubId) as { cnt: number }).cnt;
      if (stillLeads === 0) {
        UserModel.updateRole(previousLeaderId, 'student');
      }
    }
  })();

  logAction({
    actorId: req.user!.id,
    action: 'assign_club_leader',
    entityType: 'club',
    entityId: clubId,
    payload: { new_leader_id: newLeaderId, previous_leader_id: previousLeaderId },
  });

  // Sync Keycloak realm roles to match the DB changes made in the transaction.
  // Best-effort — failures are logged but do not affect the response.
  const syncPromises: Promise<void>[] = [
    syncUserRealmRole(newLeader.keycloak_id, 'club_leader', newLeader.role),
  ];
  if (previousLeaderId && previousLeaderId !== newLeaderId) {
    const prevLeader = UserModel.findById(previousLeaderId);
    if (prevLeader) {
      // Determine what the transaction set their role to
      const updatedPrev = UserModel.findById(previousLeaderId);
      syncPromises.push(
        syncUserRealmRole(prevLeader.keycloak_id, updatedPrev?.role ?? 'student', 'club_leader'),
      );
    }
  }
  Promise.all(syncPromises).catch((err: Error) => {
    logger.warn(`Keycloak role sync failed for assignClubLeader on club ${clubId}: ${err.message}`);
  });

  res.json(ClubModel.findById(clubId));
}

export function getClubDashboard(req: AuthRequest, res: Response) {
  const clubId = parseInt(req.params.id);
  const user = req.user!;

  const club = ClubModel.findById(clubId);
  if (!club) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }

  if (!isAdmin(user) && !leaderOwnsClub(user.id, clubId)) {
    res.status(403).json({ error: 'You do not have permission to view this club dashboard' });
    return;
  }

  const { published_events } = db
    .prepare(`SELECT COUNT(*) AS published_events FROM events WHERE club_id = ? AND status = 'published'`)
    .get(clubId) as { published_events: number };

  const { total_events } = db
    .prepare(`SELECT COUNT(*) AS total_events FROM events WHERE club_id = ?`)
    .get(clubId) as { total_events: number };

  const { active_members } = db
    .prepare(`SELECT COUNT(*) AS active_members FROM memberships WHERE club_id = ? AND status = 'active'`)
    .get(clubId) as { active_members: number };

  const { registered_participants } = db
    .prepare(
      `SELECT COUNT(DISTINCT r.user_id) AS registered_participants
       FROM registrations r
       JOIN events e ON e.id = r.event_id AND e.club_id = ?`,
    )
    .get(clubId) as { registered_participants: number };

  const { unique_attendees } = db
    .prepare(
      `SELECT COUNT(DISTINCT a.user_id) AS unique_attendees
       FROM attendance a
       JOIN events e ON e.id = a.event_id AND e.club_id = ?`,
    )
    .get(clubId) as { unique_attendees: number };

  const { total_attendance } = db
    .prepare(
      `SELECT COUNT(a.id) AS total_attendance
       FROM attendance a
       JOIN events e ON e.id = a.event_id AND e.club_id = ? AND e.status = 'published'`,
    )
    .get(clubId) as { total_attendance: number };

  const { total_registered } = db
    .prepare(
      `SELECT COUNT(r.id) AS total_registered
       FROM registrations r
       JOIN events e ON e.id = r.event_id AND e.club_id = ?`,
    )
    .get(clubId) as { total_registered: number };

  const { achievement_count } = db
    .prepare(`SELECT COUNT(*) AS achievement_count FROM achievements WHERE club_id = ?`)
    .get(clubId) as { achievement_count: number };

  const attendance_rate =
    total_registered > 0 ? Math.round((total_attendance / total_registered) * 100) : 0;
  const total_points = total_attendance + achievement_count;

  const recent_events = db
    .prepare(
      `SELECT id, title, title_ar, starts_at, status, category
       FROM events WHERE club_id = ? ORDER BY starts_at DESC LIMIT 5`,
    )
    .all(clubId);

  res.json({
    club_id: clubId,
    club_name: club.name,
    club_name_ar: club.name_ar,
    published_events,
    total_events,
    active_members,
    registered_participants,
    unique_attendees,
    total_attendance,
    attendance_rate,
    total_points,
    recent_events,
  });
}

export function uploadLogo(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const user = req.user!;

  const existing = ClubModel.findById(id);
  if (!existing) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }

  if (!isAdmin(user) && !leaderOwnsClub(user.id, id)) {
    res.status(403).json({ error: 'You do not have permission to update this club' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const logo_url = `/uploads/logos/${req.file.filename}`;
  const club = ClubModel.update(id, { logo_url });
  logAction({ actorId: user.id, action: 'update', entityType: 'club', entityId: id });
  res.json(club);
}
