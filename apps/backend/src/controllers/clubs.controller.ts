import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ClubModel } from '../models/club.model';
import { logAction } from '../services/audit.service';

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
  const existing = ClubModel.findById(id);
  if (!existing) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }
  const club = ClubModel.update(id, req.body);
  logAction({ actorId: req.user!.id, action: 'update', entityType: 'club', entityId: id });
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
