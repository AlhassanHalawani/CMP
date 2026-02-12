import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AchievementModel } from '../models/achievement.model';
import { generateAchievementReport } from '../services/pdf.service';
import { logAction } from '../services/audit.service';

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
  const achievement = AchievementModel.create(req.body);
  logAction({
    actorId: req.user!.id,
    action: 'create',
    entityType: 'achievement',
    entityId: achievement.id,
  });
  res.status(201).json(achievement);
}

export function remove(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const deleted = AchievementModel.delete(id);
  if (!deleted) {
    res.status(404).json({ error: 'Achievement not found' });
    return;
  }
  logAction({ actorId: req.user!.id, action: 'delete', entityType: 'achievement', entityId: id });
  res.status(204).send();
}

export async function downloadReport(req: Request, res: Response) {
  const userId = parseInt(req.params.userId);
  const pdfBuffer = await generateAchievementReport(userId);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=achievements-${userId}.pdf`);
  res.send(pdfBuffer);
}
