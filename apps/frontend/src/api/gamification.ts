import api from './client';

export interface LevelProgress {
  current_xp: number;
  current_level: number;
  current_level_floor: number;
  next_level_xp: number;
  xp_to_next_level: number;
  progress_percent: number;
}

export interface XpAction {
  action_key: string;
  xp_delta: number;
  source_type: string | null;
  source_id: number | null;
  reference_key?: string;
  created_at: string;
}

export interface GamificationSummary extends LevelProgress {
  recent_actions: XpAction[];
}

export interface LoginActivityResult {
  date: string;
  xp_awarded: number;
  new_unlocks: string[];
  level_up: boolean;
  new_level: number | null;
  gamification: LevelProgress | null;
}

export const gamificationApi = {
  getMyGamification: () =>
    api.get<GamificationSummary>('/users/me/gamification').then((r) => r.data),

  getMyXpHistory: (limit = 20) =>
    api.get<{ data: XpAction[]; total: number }>('/users/me/xp-history', { params: { limit } }).then((r) => r.data),
};
