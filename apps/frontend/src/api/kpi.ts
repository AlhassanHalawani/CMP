import api from './client';

export interface MonthPoint {
  month: string;
  label: string;
  value: number;
}

export interface TopClubEntry {
  club_id: number;
  club_name: string;
  value: number;
}

export interface OverviewSummary {
  events_count: number;
  attendance_count: number;
  registrations_count: number;
  unique_attendees: number;
  attendance_rate: number;
  avg_attendance_per_event: number;
  active_clubs: number;
}

export interface KpiOverview {
  scope: 'platform' | 'club';
  window: '6m';
  summary: OverviewSummary;
  series: {
    events_by_month: MonthPoint[];
    attendance_by_month: MonthPoint[];
    registrations_by_month: MonthPoint[];
  };
  rankings: {
    top_clubs_by_events: TopClubEntry[];
    top_clubs_by_attendance: TopClubEntry[];
  };
}

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
  member_count: number;
  rank: number;
}

export interface StudentKpiEntry {
  user_id: number;
  name: string;
  email: string;
  xp_total: number;
  attendance_count: number;
  registration_count: number;
  active_memberships: number;
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

  getOverview: (params?: { club_id?: number }) =>
    api.get<KpiOverview>('/kpi/overview', { params }).then((r) => r.data),

  leaderboardExportUrl: (format: 'csv' | 'pdf', semesterId?: number, department?: string) => {
    const params = new URLSearchParams({ format });
    if (semesterId) params.set('semester_id', String(semesterId));
    if (department) params.set('department', department);
    return `/api/kpi/leaderboard?${params.toString()}`;
  },
};
