import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PageViewModel } from '../models/pageView.model';

function deriveDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad/.test(ua)) return 'tablet';
  if (/mobile|android|iphone|ipod/.test(ua)) return 'mobile';
  if (ua.length > 0) return 'desktop';
  return 'unknown';
}

export function recordPageView(req: Request, res: Response) {
  const { session_id, path, referrer } = req.body as {
    session_id: string;
    path: string;
    referrer?: string;
  };

  if (!session_id || !path) {
    res.status(400).json({ error: 'session_id and path are required' });
    return;
  }

  const userAgent = req.headers['user-agent'] ?? '';
  const device_type = deriveDeviceType(userAgent);
  const user_id = (req as AuthRequest).user?.id ?? null;

  PageViewModel.create({ session_id, path, device_type, referrer, user_id });
  res.status(204).send();
}

export function getTraffic(req: AuthRequest, res: Response) {
  const rangeParam = req.query.range as string | undefined;
  const range = rangeParam === '7d' || rangeParam === '30d' || rangeParam === '90d' ? rangeParam : '30d';
  const data = PageViewModel.getTraffic(range);
  res.json(data);
}
