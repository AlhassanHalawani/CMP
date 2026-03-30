import api from './client';

export interface ClubKpiSummary {
  club_id: number;
  metric_key: string;
  total: number;
}

export interface LeaderboardEntry {
  club_id: number;
  club_name: string;
  department: string | null;
  attendance_count: number;
  achievement_count: number;
  member_count: number;
  total_score: number;
  rank: number;
}

export interface StudentKpiEntry {
  user_id: number;
  name: string;
  email: string;
  attendance_count: number;
  achievement_count: number;
  registration_count: number;
  active_memberships: number;
  engagement_score: number;
  rank: number;
}

export const kpiApi = {
  getClubSummary: (clubId: number, semesterId?: number) =>
    api.get<{ data: ClubKpiSummary[] }>(`/kpi/club/${clubId}`, { params: { semester_id: semesterId } }).then((r) => r.data),

  getLeaderboard: (semesterId?: number, department?: string) =>
    api
      .get<{ data: LeaderboardEntry[] }>('/kpi/leaderboard', {
        params: { semester_id: semesterId, department },
      })
      .then((r) => r.data),

  recordMetric: (data: { club_id: number; metric_key: string; metric_value: number; semester_id?: number }) =>
    api.post('/kpi', data).then((r) => r.data),

  computeKpi: (semesterId: number) =>
    api.post<{ computed: boolean; semester_id: number; clubs_updated: number }>('/kpi/compute', { semester_id: semesterId }).then((r) => r.data),

  getStudentKpi: (semesterId?: number) =>
    api
      .get<{ data: StudentKpiEntry[] }>('/kpi/students', { params: { semester_id: semesterId } })
      .then((r) => r.data),

  leaderboardExportUrl: (format: 'csv' | 'pdf', semesterId?: number, department?: string) => {
    const params = new URLSearchParams({ format });
    if (semesterId) params.set('semester_id', String(semesterId));
    if (department) params.set('department', department);
    return `/api/kpi/leaderboard?${params.toString()}`;
  },
};
