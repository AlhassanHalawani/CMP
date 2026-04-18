import api from './client';

export interface Club {
  id: number;
  name: string;
  name_ar: string;
  description: string | null;
  description_ar: string | null;
  logo_url: string | null;
  leader_id: number | null;
  created_at: string;
}

export interface ClubStats {
  published_events: number;
  total_attendance: number;
  active_members: number;
}

export interface ClubDashboard {
  club_id: number;
  club_name: string;
  club_name_ar: string;
  published_events: number;
  total_events: number;
  active_members: number;
  registered_participants: number;
  unique_attendees: number;
  total_attendance: number;
  attendance_rate: number;
  recent_events: Array<{
    id: number;
    title: string;
    title_ar: string;
    starts_at: string;
    status: string;
    category: string | null;
  }>;
}

export const clubsApi = {
  list: (params?: { limit?: number; offset?: number }) =>
    api.get<{ data: Club[]; total: number }>('/clubs', { params }).then((r) => r.data),
  get: (id: number) => api.get<Club>(`/clubs/${id}`).then((r) => r.data),
  create: (data: Partial<Club>) => api.post<Club>('/clubs', data).then((r) => r.data),
  update: (id: number, data: Partial<Club>) => api.patch<Club>(`/clubs/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/clubs/${id}`),
  getStats: (id: number) => api.get<ClubStats>(`/clubs/${id}/stats`).then((r) => r.data),
  uploadLogo: (id: number, file: File) => {
    const fd = new FormData();
    fd.append('logo', file);
    return api.post<Club>(`/clubs/${id}/logo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
  assignLeader: (clubId: number, userId: number) =>
    api.post<Club>(`/clubs/${clubId}/assign-leader`, { user_id: userId }).then((r) => r.data),
  getDashboard: (id: number) =>
    api.get<ClubDashboard>(`/clubs/${id}/dashboard`).then((r) => r.data),
};
