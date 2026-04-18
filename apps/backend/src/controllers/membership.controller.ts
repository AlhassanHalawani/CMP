import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { MembershipModel } from '../models/membership.model';
import { ClubModel } from '../models/club.model';
import { canManageClub } from '../services/ownership.service';
import { notify } from '../services/notifications.service';
import { logAction } from '../services/audit.service';
import { evaluateClubAchievements } from '../services/achievement-engine.service';
import { evaluateStudentBadges } from '../services/badge-engine.service';
import { awardXp } from '../services/gamification.service';

export async function joinClub(req: AuthRequest, res: Response) {
  const clubId = parseInt(req.params.id);
  const userId = req.user!.id;

  const club = ClubModel.findById(clubId);
  if (!club) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }

  const existing = MembershipModel.findByClubAndUser(clubId, userId);
  if (existing) {
    if (existing.status === 'active') {
      res.status(409).json({ error: 'Already a member' });
      return;
    }
    if (existing.status === 'pending') {
      res.status(409).json({ error: 'Membership request already pending' });
      return;
    }
    // inactive → re-request
    const updated = MembershipModel.updateStatus(existing.id, 'pending');
    if (club.leader_id) {
      await notify({
        userId: club.leader_id,
        eventType: 'membership_requested',
        title: 'New Membership Request',
        body: `${req.user!.name} has requested to join "${club.name}".`,
        type: 'info',
      });
    }
    res.status(201).json(updated);
    return;
  }

  const membership = MembershipModel.create(clubId, userId);
  if (club.leader_id) {
    await notify({
      userId: club.leader_id,
      eventType: 'membership_requested',
      title: 'New Membership Request',
      body: `${req.user!.name} has requested to join "${club.name}".`,
      type: 'info',
    });
  }
  res.status(201).json(membership);
}

export function leaveClub(req: AuthRequest, res: Response) {
  const clubId = parseInt(req.params.id);
  const userId = req.user!.id;

  const existing = MembershipModel.findByClubAndUser(clubId, userId);
  if (!existing || existing.status === 'inactive') {
    res.status(404).json({ error: 'Membership not found' });
    return;
  }

  MembershipModel.updateStatus(existing.id, 'inactive');
  res.status(204).send();
}

export function listMembers(req: AuthRequest, res: Response) {
  const clubId = parseInt(req.params.id);
  const user = req.user!;

  if (!canManageClub(user, clubId)) {
    res.status(403).json({ error: 'You do not have permission to view members of this club' });
    return;
  }

  const status = req.query.status as string | undefined;
  const members = MembershipModel.findByClub(clubId, status);
  res.json({ data: members });
}

export async function updateMembership(req: AuthRequest, res: Response) {
  const clubId = parseInt(req.params.id);
  const targetUserId = parseInt(req.params.userId);
  const { status } = req.body;
  const user = req.user!;

  if (!['active', 'inactive'].includes(status)) {
    res.status(400).json({ error: 'status must be active or inactive' });
    return;
  }

  if (!canManageClub(user, clubId)) {
    res.status(403).json({ error: 'You do not have permission to manage members of this club' });
    return;
  }

  const club = ClubModel.findById(clubId);
  if (!club) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }

  const membership = MembershipModel.findByClubAndUser(clubId, targetUserId);
  if (!membership) {
    res.status(404).json({ error: 'Membership not found' });
    return;
  }

  const updated = MembershipModel.updateStatus(membership.id, status);
  logAction({ actorId: user.id, action: `membership_${status}`, entityType: 'membership', entityId: membership.id });

  if (status === 'active') {
    await notify({
      userId: targetUserId,
      eventType: 'membership_approved',
      title: 'Membership Approved',
      body: `Your membership request to "${club.name}" has been approved.`,
      type: 'success',
    });
    // Award XP for joining a club (only when membership becomes active, not at pending stage)
    try {
      const xpResult = awardXp({
        userId: targetUserId,
        actionKey: 'membership_joined',
        referenceKey: `membership:${clubId}:${targetUserId}`,
        sourceType: 'club',
        sourceId: clubId,
      });
      if (xpResult?.level_up) {
        await notify({
          userId: targetUserId,
          eventType: 'level_up',
          title: 'Level Up!',
          body: `You reached Level ${xpResult.new_level}. Keep it up!`,
          type: 'success',
          targetUrl: '/profile',
        });
      }
    } catch { /* best-effort */ }
    // Best-effort: evaluate club achievements and student badges after a new member is approved
    try { evaluateClubAchievements(clubId); } catch { /* ignore */ }
    try { evaluateStudentBadges(targetUserId); } catch { /* ignore */ }
  } else {
    await notify({
      userId: targetUserId,
      eventType: 'membership_declined',
      title: 'Membership Declined',
      body: `Your membership request to "${club.name}" was declined.`,
      type: 'error',
    });
  }

  res.json(updated);
}

export function getMembership(req: AuthRequest, res: Response) {
  const clubId = parseInt(req.params.id);
  const userId = req.user!.id;

  const membership = MembershipModel.findByClubAndUser(clubId, userId);
  res.json(membership ?? null);
}
