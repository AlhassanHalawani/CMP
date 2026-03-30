import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { KpiModel } from '../models/kpi.model';
import { isAdmin, leaderOwnsClub } from '../services/ownership.service';
import { generateKpiReport } from '../services/pdf.service';
import { db } from '../config/database';

export function recordMetric(req: AuthRequest, res: Response) {
  const user = req.user!;
  const clubId = req.body.club_id;

  // club_leader can only record metrics for clubs they lead
  if (!isAdmin(user)) {
    if (!clubId || !leaderOwnsClub(user.id, clubId)) {
      res.status(403).json({ error: 'You can only record metrics for clubs you lead' });
      return;
    }
  }

  const metric = KpiModel.recordMetric(req.body);
  res.status(201).json(metric);
}

export function getClubSummary(req: Request, res: Response) {
  const clubId = parseInt(req.params.clubId);
  const semesterId = req.query.semester_id ? parseInt(req.query.semester_id as string) : undefined;
  const summary = KpiModel.getClubSummary(clubId, semesterId);
  res.json({ data: summary });
}

export async function getLeaderboard(req: Request, res: Response) {
  const semesterId = req.query.semester_id ? parseInt(req.query.semester_id as string) : undefined;
  const department = req.query.department as string | undefined;
  const format = req.query.format as string | undefined;

  const leaderboard = KpiModel.getLeaderboard(semesterId, department);

  if (format === 'csv') {
    const rows = [['Rank', 'Club', 'Department', 'Attendance', 'Achievements', 'Members', 'Total Score']];
    for (const club of leaderboard) {
      rows.push([
        String(club.rank),
        club.club_name,
        club.department ?? '',
        String(club.attendance_count),
        String(club.achievement_count),
        String(club.member_count),
        String(club.total_score),
      ]);
    }
    const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=kpi-leaderboard.csv');
    return res.send(csv);
  }

  if (format === 'pdf') {
    let semesterName = 'All Time';
    if (semesterId) {
      const s = db.prepare('SELECT name FROM semesters WHERE id = ?').get(semesterId) as { name: string } | undefined;
      if (s) semesterName = s.name;
    }
    const pdfBuffer = await generateKpiReport(leaderboard, semesterName);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=kpi-leaderboard.pdf');
    return res.send(pdfBuffer);
  }

  res.json({ data: leaderboard });
}

export function getStudentKpi(req: Request, res: Response) {
  const semesterId = req.query.semester_id ? parseInt(req.query.semester_id as string) : undefined;
  const students = KpiModel.getStudentKpi(semesterId);
  res.json({ data: students });
}

export function computeKpi(req: AuthRequest, res: Response) {
  const semesterId = parseInt(req.body.semester_id);
  if (!semesterId || isNaN(semesterId)) {
    res.status(400).json({ error: 'semester_id is required' });
    return;
  }

  try {
    const clubsUpdated = KpiModel.computeKpi(semesterId);
    res.json({ computed: true, semester_id: semesterId, clubs_updated: clubsUpdated });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
}
