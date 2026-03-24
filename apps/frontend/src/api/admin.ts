import api from './client';

export interface Stats {
  users: number;
  clubs: number;
  events: number;
}

export interface AuditLog {
  id: number;
  actor_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  payload: string | null;
  created_at: string;
}

export interface Semester {
  id: number;
  name: string;
  starts_at: string;
  ends_at: string;
  is_active: number;
}

export const adminApi = {
  getStats: () => api.get<Stats>('/admin/stats').then((r) => r.data),
  getAuditLog: (params?: { limit?: number; offset?: number }) =>
    api.get<{ data: AuditLog[] }>('/admin/audit-log', { params }).then((r) => r.data),
  listSemesters: () => api.get<{ data: Semester[] }>('/admin/semesters').then((r) => r.data),
  createSemester: (data: { name: string; starts_at: string; ends_at: string }) =>
    api.post<Semester>('/admin/semesters', data).then((r) => r.data),
  activateSemester: (id: number) => api.patch(`/admin/semesters/${id}/activate`).then((r) => r.data),
  deleteSemester: (id: number) => api.delete(`/admin/semesters/${id}`),
};

export interface LeaderRequest {
  id: number;
  user_id: number;
  club_id: number;
  status: 'pending' | 'approved' | 'rejected';
  message: string | null;
  admin_notes: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
  user_name: string;
  user_email: string;
  club_name: string;
}

export const leaderRequestsApi = {
  list: (params?: { status?: string }) =>
    api.get<{ data: LeaderRequest[] }>('/leader-requests', { params }).then((r) => r.data),
  mine: () => api.get<{ data: LeaderRequest[] }>('/leader-requests/mine').then((r) => r.data),
  create: (data: { club_id: number; message?: string }) =>
    api.post<LeaderRequest>('/leader-requests', data).then((r) => r.data),
  approve: (id: number, admin_notes?: string) =>
    api.patch<LeaderRequest>(`/leader-requests/${id}/approve`, { admin_notes }).then((r) => r.data),
  reject: (id: number, admin_notes?: string) =>
    api.patch<LeaderRequest>(`/leader-requests/${id}/reject`, { admin_notes }).then((r) => r.data),
};
