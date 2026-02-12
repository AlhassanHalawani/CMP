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

export const clubsApi = {
  list: (params?: { limit?: number; offset?: number }) =>
    api.get<{ data: Club[]; total: number }>('/clubs', { params }).then((r) => r.data),
  get: (id: number) => api.get<Club>(`/clubs/${id}`).then((r) => r.data),
  create: (data: Partial<Club>) => api.post<Club>('/clubs', data).then((r) => r.data),
  update: (id: number, data: Partial<Club>) => api.patch<Club>(`/clubs/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/clubs/${id}`),
};
