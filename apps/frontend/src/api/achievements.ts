import api from './client';

export interface Achievement {
  id: number;
  user_id: number;
  club_id: number;
  title: string;
  title_ar: string;
  description: string | null;
  description_ar: string | null;
  awarded_at: string;
  semester_id: number | null;
}

export interface AchievementDefinition {
  id: number;
  code: string;
  entity_type: 'student' | 'club';
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  tier: 'Bronze' | 'Silver' | 'Gold';
  points: number;
  metric: string;
  threshold: number;
  is_active: number;
}

export interface AchievementUnlock {
  id: number;
  definition_id: number;
  entity_type: string;
  entity_id: number;
  unlocked_at: string;
}

export interface EngineProgress {
  definitions: AchievementDefinition[];
  unlocks: AchievementUnlock[];
  metrics: Record<string, number>;
}

export const achievementsApi = {
  listAll: (params?: { user_id?: number; club_id?: number; semester_id?: number }) =>
    api.get<{ data: Achievement[] }>('/achievements', { params }).then((r) => r.data),

  listForUser: (userId: number) =>
    api.get<{ data: Achievement[] }>(`/achievements/user/${userId}`).then((r) => r.data),

  listForClub: (clubId: number) =>
    api.get<{ data: Achievement[] }>(`/achievements/club/${clubId}`).then((r) => r.data),

  downloadReport: async (userId: number, params: { semester_id?: number; club_id?: number; report_date?: string }) => {
    const query = new URLSearchParams();
    if (params.semester_id) query.set('semester_id', String(params.semester_id));
    if (params.club_id) query.set('club_id', String(params.club_id));
    if (params.report_date) query.set('report_date', params.report_date);
    const response = await api.get(`/achievements/user/${userId}/report?${query}`, { responseType: 'blob' });
    return response.data as Blob;
  },

  getMyProgress: () =>
    api.get<EngineProgress>('/achievements/engine/progress/me').then((r) => r.data),

  getClubProgress: (clubId: number) =>
    api.get<EngineProgress>(`/achievements/engine/progress/club/${clubId}`).then((r) => r.data),
};
