import api from './client';

export interface ClubKpiSummary {
  club_id: number;
  metric_key: string;
  total: number;
}

export interface LeaderboardEntry {
  club_id: number;
  club_name: string;
  total_score: number;
}

export const kpiApi = {
  getClubSummary: (clubId: number, semesterId?: number) =>
    api.get<{ data: ClubKpiSummary[] }>(`/kpi/club/${clubId}`, { params: { semester_id: semesterId } }).then((r) => r.data),
  getLeaderboard: (semesterId?: number) =>
    api.get<{ data: LeaderboardEntry[] }>('/kpi/leaderboard', { params: { semester_id: semesterId } }).then((r) => r.data),
  recordMetric: (data: { club_id: number; metric_key: string; metric_value: number; semester_id?: number }) =>
    api.post('/kpi', data).then((r) => r.data),
};
