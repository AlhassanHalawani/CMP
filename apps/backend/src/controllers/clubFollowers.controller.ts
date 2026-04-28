import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ClubFollowerModel } from '../models/clubFollower.model';
import { ClubModel } from '../models/club.model';
import { canManageClub } from '../services/ownership.service';

export function followClub(req: AuthRequest, res: Response) {
  const clubId = parseInt(req.params.id);
  const userId = req.user!.id;

  const club = ClubModel.findById(clubId);
  if (!club) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }

  const existing = ClubFollowerModel.findByClubAndUser(clubId, userId);
  if (existing) {
    res.status(409).json({ error: 'Already following this club' });
    return;
  }

  const follower = ClubFollowerModel.follow(clubId, userId);
  res.status(201).json(follower);
}

export function unfollowClub(req: AuthRequest, res: Response) {
  const clubId = parseInt(req.params.id);
  const userId = req.user!.id;

  const deleted = ClubFollowerModel.unfollow(clubId, userId);
  if (!deleted) {
    res.status(404).json({ error: 'You are not following this club' });
    return;
  }

  res.status(204).send();
}

export function getMyFollow(req: AuthRequest, res: Response) {
  const clubId = parseInt(req.params.id);
  const userId = req.user!.id;

  const follow = ClubFollowerModel.findByClubAndUser(clubId, userId);
  res.json(follow ?? null);
}

export function listFollowers(req: AuthRequest, res: Response) {
  const clubId = parseInt(req.params.id);
  const user = req.user!;

  if (!canManageClub(user, clubId)) {
    res.status(403).json({ error: 'You do not have permission to view followers of this club' });
    return;
  }

  const followers = ClubFollowerModel.listByClub(clubId);
  res.json({ data: followers });
}
