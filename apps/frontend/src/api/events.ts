import api from './client';

export interface Event {
  id: number;
  club_id: number;
  title: string;
  title_ar: string;
  description: string | null;
  description_ar: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number | null;
  status: string;
  created_by: number | null;
  created_at: string;
}

export const eventsApi = {
  list: (params?: { status?: string; club_id?: number; limit?: number; offset?: number }) =>
    api.get<{ data: Event[]; total: number }>('/events', { params }).then((r) => r.data),
  get: (id: number) => api.get<Event>(`/events/${id}`).then((r) => r.data),
  create: (data: Partial<Event>) => api.post<Event>('/events', data).then((r) => r.data),
  update: (id: number, data: Partial<Event>) => api.patch<Event>(`/events/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/events/${id}`),
  register: (id: number) => api.post(`/events/${id}/register`).then((r) => r.data),
  cancelRegistration: (id: number) => api.post(`/events/${id}/cancel`).then((r) => r.data),
};
