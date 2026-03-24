import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { LeaderRequestModel } from '../models/leader-request.model';
import { ClubModel } from '../models/club.model';
import { UserModel } from '../models/user.model';
import { db } from '../config/database';
import { logAction } from '../services/audit.service';
import { notify } from '../services/notifications.service';

/** POST /api/leader-requests — student submits a request */
export async function createLeaderRequest(req: AuthRequest, res: Response) {
  const user = req.user!;
  const clubId: number | undefined = req.body.club_id;
  const message: string | undefined = req.body.message;

  if (!clubId) {
    res.status(400).json({ error: 'club_id is required' });
    return;
  }

  const club = ClubModel.findById(clubId);
  if (!club) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }

  // Only students may request — existing leaders and admins don't need to
  if (user.role !== 'student') {
    res.status(400).json({ error: 'Only students can submit a club leader request' });
    return;
  }

  // Prevent duplicate pending request
  const existing = LeaderRequestModel.findPendingByUserAndClub(user.id, clubId);
  if (existing) {
    res.status(409).json({ error: 'You already have a pending request for this club' });
    return;
  }

  const request = LeaderRequestModel.create({ user_id: user.id, club_id: clubId, message });
  logAction({ actorId: user.id, action: 'create_leader_request', entityType: 'leader_request', entityId: request.id });

  // Notify admins
  const admins = (db.prepare("SELECT id FROM users WHERE role = 'admin'").all() as { id: number }[]);
  for (const admin of admins) {
    await notify({
      userId: admin.id,
      eventType: 'leader_request_submitted',
      title: 'New Club Leader Request',
      body: `${user.name} has requested to become the leader of "${club.name}".`,
      type: 'info',
    });
  }

  res.status(201).json(request);
}

/** GET /api/leader-requests — admin lists all requests */
export function listLeaderRequests(req: AuthRequest, res: Response) {
  const status = req.query.status as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const requests = LeaderRequestModel.listAll({ status, limit, offset });
  res.json({ data: requests });
}

/** GET /api/leader-requests/mine — current user's own requests */
export function listMyLeaderRequests(req: AuthRequest, res: Response) {
  const requests = LeaderRequestModel.listByUser(req.user!.id);
  res.json({ data: requests });
}

/** PATCH /api/leader-requests/:id/approve — admin approves */
export async function approveLeaderRequest(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const admin = req.user!;

  const request = LeaderRequestModel.findById(id);
  if (!request) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }
  if (request.status !== 'pending') {
    res.status(400).json({ error: 'Only pending requests can be approved' });
    return;
  }

  const club = ClubModel.findById(request.club_id);
  if (!club) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }

  const previousLeaderId = club.leader_id;

  db.transaction(() => {
    // Mark request as approved
    LeaderRequestModel.updateStatus(id, 'approved', admin.id, req.body.admin_notes);
    // Assign club leader
    ClubModel.update(request.club_id, { leader_id: request.user_id });
    // Promote new leader
    UserModel.updateRole(request.user_id, 'club_leader');
    // Demote previous leader if they no longer lead any other club
    if (previousLeaderId && previousLeaderId !== request.user_id) {
      const stillLeads = (db.prepare(
        'SELECT COUNT(*) as cnt FROM clubs WHERE leader_id = ? AND id != ?'
      ).get(previousLeaderId, request.club_id) as { cnt: number }).cnt;
      if (stillLeads === 0) {
        UserModel.updateRole(previousLeaderId, 'student');
      }
    }
  })();

  logAction({ actorId: admin.id, action: 'approve_leader_request', entityType: 'leader_request', entityId: id });

  await notify({
    userId: request.user_id,
    eventType: 'leader_request_approved',
    title: 'Club Leader Request Approved',
    body: `Your request to lead "${club.name}" has been approved. You are now the club leader!`,
    type: 'success',
  });

  res.json(LeaderRequestModel.findById(id));
}

/** PATCH /api/leader-requests/:id/reject — admin rejects */
export async function rejectLeaderRequest(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const admin = req.user!;

  const request = LeaderRequestModel.findById(id);
  if (!request) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }
  if (request.status !== 'pending') {
    res.status(400).json({ error: 'Only pending requests can be rejected' });
    return;
  }

  const club = ClubModel.findById(request.club_id);

  const updated = LeaderRequestModel.updateStatus(id, 'rejected', admin.id, req.body.admin_notes);
  logAction({ actorId: admin.id, action: 'reject_leader_request', entityType: 'leader_request', entityId: id });

  await notify({
    userId: request.user_id,
    eventType: 'leader_request_rejected',
    title: 'Club Leader Request Rejected',
    body: `Your request to lead "${club?.name ?? 'a club'}" was not approved.${req.body.admin_notes ? ` Notes: ${req.body.admin_notes}` : ''}`,
    type: 'error',
  });

  res.json(updated);
}
