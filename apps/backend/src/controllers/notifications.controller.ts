import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { NotificationModel } from '../models/notification.model';

export function list(req: AuthRequest, res: Response) {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const notifications = NotificationModel.listForUser(req.user!.id, { limit, offset });
  const unread = NotificationModel.countUnread(req.user!.id);
  res.json({ data: notifications, unread });
}

export function markRead(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  NotificationModel.markRead(id);
  res.json({ message: 'Marked as read' });
}

export function markAllRead(req: AuthRequest, res: Response) {
  NotificationModel.markAllRead(req.user!.id);
  res.json({ message: 'All marked as read' });
}
