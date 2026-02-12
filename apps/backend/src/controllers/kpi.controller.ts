import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { KpiModel } from '../models/kpi.model';

export function recordMetric(req: AuthRequest, res: Response) {
  const metric = KpiModel.recordMetric(req.body);
  res.status(201).json(metric);
}

export function getClubSummary(req: Request, res: Response) {
  const clubId = parseInt(req.params.clubId);
  const semesterId = req.query.semester_id ? parseInt(req.query.semester_id as string) : undefined;
  const summary = KpiModel.getClubSummary(clubId, semesterId);
  res.json({ data: summary });
}

export function getLeaderboard(req: Request, res: Response) {
  const semesterId = req.query.semester_id ? parseInt(req.query.semester_id as string) : undefined;
  const leaderboard = KpiModel.getLeaderboard(semesterId);
  res.json({ data: leaderboard });
}
