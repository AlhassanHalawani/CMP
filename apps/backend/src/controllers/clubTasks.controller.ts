import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ClubTaskModel, TaskStatus } from '../models/clubTask.model';
import { MembershipModel } from '../models/membership.model';
import { ClubModel } from '../models/club.model';
import { canManageClub, isAdmin } from '../services/ownership.service';
import { notify } from '../services/notifications.service';
import { logAction } from '../services/audit.service';

const VALID_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done', 'cancelled'];
const MEMBER_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];

export function listClubTasks(req: AuthRequest, res: Response) {
  const clubId = parseInt(req.params.id);
  const user = req.user!;

  if (!canManageClub(user, clubId)) {
    res.status(403).json({ error: 'You do not have permission to view tasks for this club' });
    return;
  }

  const { status, assigned_to, role_key, event_id } = req.query;
  const tasks = ClubTaskModel.listByClub(clubId, {
    status: status as string | undefined,
    assigned_to: assigned_to ? parseInt(assigned_to as string) : undefined,
    role_key: role_key as string | undefined,
    event_id: event_id ? parseInt(event_id as string) : undefined,
  });

  res.json({ data: tasks });
}

export async function createClubTask(req: AuthRequest, res: Response) {
  const clubId = parseInt(req.params.id);
  const user = req.user!;

  if (!canManageClub(user, clubId)) {
    res.status(403).json({ error: 'You do not have permission to create tasks for this club' });
    return;
  }

  const club = ClubModel.findById(clubId);
  if (!club) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }

  const { title, description, assigned_to, role_key, event_id, priority, due_at } = req.body;

  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  if (assigned_to) {
    const membership = MembershipModel.findByClubAndUser(clubId, assigned_to);
    if (!membership || membership.status !== 'active') {
      res.status(400).json({ error: 'assigned_to must be an active member of this club' });
      return;
    }
  }

  const task = ClubTaskModel.create({
    club_id: clubId,
    event_id: event_id ?? null,
    title,
    description: description ?? null,
    priority: priority ?? 'normal',
    due_at: due_at ?? null,
    created_by: user.id,
    assigned_to: assigned_to ?? null,
    role_key: role_key ?? null,
  });

  logAction({ actorId: user.id, action: 'create_task', entityType: 'club_task', entityId: task.id });

  if (assigned_to) {
    await notify({
      userId: assigned_to,
      eventType: 'task_assigned',
      title: 'New Task Assigned',
      body: `You have been assigned a new task: "${title}" in "${club.name}".`,
      type: 'info',
      targetUrl: `/clubs/${clubId}`,
    });
  }

  res.status(201).json(task);
}

export async function updateClubTask(req: AuthRequest, res: Response) {
  const clubId = parseInt(req.params.id);
  const taskId = parseInt(req.params.taskId);
  const user = req.user!;

  const task = ClubTaskModel.findById(taskId);
  if (!task || task.club_id !== clubId) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const isManager = canManageClub(user, clubId);
  const isAssignee = task.assigned_to === user.id;
  const membership = !isManager ? MembershipModel.findByClubAndUser(clubId, user.id) : null;
  const isActiveMember = membership?.status === 'active';

  if (!isManager && !(isAssignee && isActiveMember)) {
    res.status(403).json({ error: 'You do not have permission to update this task' });
    return;
  }

  const { title, description, status, priority, due_at, assigned_to, role_key, event_id } = req.body;

  // Members can only update status (not reassign or change other fields)
  if (!isManager) {
    if (status && !MEMBER_STATUSES.includes(status)) {
      res.status(400).json({ error: 'Members can only set status to todo, in_progress, or done' });
      return;
    }
    const updated = ClubTaskModel.update(taskId, { status });
    return res.json(updated);
  }

  if (status && !VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    return;
  }

  if (assigned_to !== undefined && assigned_to !== null) {
    const targetMembership = MembershipModel.findByClubAndUser(clubId, assigned_to);
    if (!targetMembership || targetMembership.status !== 'active') {
      res.status(400).json({ error: 'assigned_to must be an active member of this club' });
      return;
    }
  }

  const club = ClubModel.findById(clubId)!;
  const updated = ClubTaskModel.update(taskId, { title, description, status, priority, due_at, assigned_to, role_key, event_id });

  if (assigned_to && assigned_to !== task.assigned_to) {
    await notify({
      userId: assigned_to,
      eventType: 'task_assigned',
      title: 'Task Assigned',
      body: `You have been assigned: "${updated.title}" in "${club.name}".`,
      type: 'info',
      targetUrl: `/clubs/${clubId}`,
    });
  }

  res.json(updated);
}

export function deleteClubTask(req: AuthRequest, res: Response) {
  const clubId = parseInt(req.params.id);
  const taskId = parseInt(req.params.taskId);
  const user = req.user!;

  if (!canManageClub(user, clubId)) {
    res.status(403).json({ error: 'You do not have permission to delete tasks for this club' });
    return;
  }

  const task = ClubTaskModel.findById(taskId);
  if (!task || task.club_id !== clubId) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  ClubTaskModel.delete(taskId);
  logAction({ actorId: user.id, action: 'delete_task', entityType: 'club_task', entityId: taskId });
  res.status(204).send();
}

export function getMyClubTasks(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const tasks = ClubTaskModel.listByAssignee(userId);
  res.json({ data: tasks });
}
