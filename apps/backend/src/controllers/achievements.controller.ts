import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AchievementModel } from '../models/achievement.model';
import { generateAchievementReport } from '../services/pdf.service';
import { logAction } from '../services/audit.service';
import { isAdmin, leaderOwnsClub } from '../services/ownership.service';
import { getStudentProgress, getClubProgress } from '../services/achievement-engine.service';

export function listAll(req: Request, res: Response) {
  const userId = req.query.user_id ? parseInt(req.query.user_id as string) : undefined;
  const clubId = req.query.club_id ? parseInt(req.query.club_id as string) : undefined;
  const semesterId = req.query.semester_id ? parseInt(req.query.semester_id as string) : undefined;
  const achievements = AchievementModel.findAll({ userId, clubId, semesterId });
  res.json({ data: achievements });
}

export function listForUser(req: Request, res: Response) {
  const userId = parseInt(req.params.userId);
  const achievements = AchievementModel.findByUser(userId);
  res.json({ data: achievements });
}

export function listForClub(req: Request, res: Response) {
  const clubId = parseInt(req.params.clubId);
  const achievements = AchievementModel.findByClub(clubId);
  res.json({ data: achievements });
}

export function create(req: AuthRequest, res: Response) {
  const user = req.user!;
  const clubId = req.body.club_id;

  // club_leader can only award achievements for clubs they lead
  if (!isAdmin(user)) {
    if (!clubId || !leaderOwnsClub(user.id, clubId)) {
      res.status(403).json({ error: 'You can only award achievements for clubs you lead' });
      return;
    }
  }

  const achievement = AchievementModel.create(req.body);
  logAction({
    actorId: user.id,
    action: 'create',
    entityType: 'achievement',
    entityId: achievement.id,
  });
  res.status(201).json(achievement);
}

export function remove(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const user = req.user!;

  // Load the achievement to check ownership before deleting
  const achievement = AchievementModel.findById(id);
  if (!achievement) {
    res.status(404).json({ error: 'Achievement not found' });
    return;
  }

  // club_leader can only remove achievements from clubs they lead
  if (!isAdmin(user) && !leaderOwnsClub(user.id, achievement.club_id)) {
    res.status(403).json({ error: 'You do not have permission to remove this achievement' });
    return;
  }

  AchievementModel.delete(id);
  logAction({ actorId: user.id, action: 'delete', entityType: 'achievement', entityId: id });
  res.status(204).send();
}

export async function downloadReport(req: Request, res: Response) {
  const userId = parseInt(req.params.userId);
  const semesterId = req.query.semester_id ? parseInt(req.query.semester_id as string) : undefined;
  const clubId = req.query.club_id ? parseInt(req.query.club_id as string) : undefined;
  const reportDate = typeof req.query.report_date === 'string' ? req.query.report_date : undefined;

  const pdfBuffer = await generateAchievementReport(userId, { semesterId, clubId, reportDate });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=achievements-${userId}.pdf`);
  res.send(pdfBuffer);
}

export function getMyEngineProgress(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  res.json(getStudentProgress(userId));
}

export function getClubEngineProgress(req: AuthRequest, res: Response) {
  const clubId = parseInt(req.params.clubId);
  if (isNaN(clubId)) {
    res.status(400).json({ error: 'Invalid club ID' });
    return;
  }
  res.json(getClubProgress(clubId));
}
