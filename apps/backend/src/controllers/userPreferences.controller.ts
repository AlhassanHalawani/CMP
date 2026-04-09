import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { UserUiPreferenceModel } from '../models/userUiPreference.model';

export function getMyPreferences(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const prefs = UserUiPreferenceModel.findByUserId(userId);
  // Return defaults if none saved yet
  res.json(prefs ?? {
    user_id: userId,
    theme: null,
    color_preset: 'indigo',
    radius_base: '0px',
    box_shadow_x: '4px',
    box_shadow_y: '4px',
    font_weight_heading: '700',
    font_weight_base: '500',
  });
}

export function updateMyPreferences(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const allowed = ['theme', 'color_preset', 'radius_base', 'box_shadow_x', 'box_shadow_y', 'font_weight_heading', 'font_weight_base'] as const;
  const data: Record<string, string | null> = {};
  for (const key of allowed) {
    if (key in req.body) data[key] = req.body[key];
  }
  const prefs = UserUiPreferenceModel.upsert(userId, data);
  res.json(prefs);
}
