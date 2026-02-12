import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { UserModel } from '../models/user.model';
import { ClubModel } from '../models/club.model';
import { EventModel } from '../models/event.model';
import { AuditLogModel } from '../models/auditLog.model';
import { SemesterModel } from '../models/semester.model';
import { logAction } from '../services/audit.service';

export function getStats(_req: AuthRequest, res: Response) {
  res.json({
    users: UserModel.count(),
    clubs: ClubModel.count(),
    events: EventModel.count(),
  });
}

export function getAuditLog(req: AuthRequest, res: Response) {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const entityType = req.query.entity_type as string | undefined;
  const logs = AuditLogModel.list({ limit, offset, entity_type: entityType });
  res.json({ data: logs });
}

export function listSemesters(_req: AuthRequest, res: Response) {
  res.json({ data: SemesterModel.list() });
}

export function createSemester(req: AuthRequest, res: Response) {
  const semester = SemesterModel.create(req.body);
  logAction({ actorId: req.user!.id, action: 'create', entityType: 'semester', entityId: semester.id });
  res.status(201).json(semester);
}

export function setActiveSemester(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const semester = SemesterModel.findById(id);
  if (!semester) {
    res.status(404).json({ error: 'Semester not found' });
    return;
  }
  SemesterModel.setActive(id);
  logAction({ actorId: req.user!.id, action: 'set_active', entityType: 'semester', entityId: id });
  res.json(SemesterModel.findById(id));
}

export function deleteSemester(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const deleted = SemesterModel.delete(id);
  if (!deleted) {
    res.status(404).json({ error: 'Semester not found' });
    return;
  }
  logAction({ actorId: req.user!.id, action: 'delete', entityType: 'semester', entityId: id });
  res.status(204).send();
}
