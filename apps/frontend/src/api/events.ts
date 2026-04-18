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
  status: 'draft' | 'submitted' | 'published' | 'rejected' | 'cancelled' | 'completed';
  rejection_notes: string | null;
  members_only: number;
  delivery_mode: 'physical' | 'online';
  created_by: number | null;
  created_at: string;
  checkin_open: number;
  checkin_finalized: number;
  category: string | null;
  twitter_url: string | null;
  registration_count?: number;
}

export const eventsApi = {
  list: (params?: {
    status?: string;
    club_id?: number;
    limit?: number;
    offset?: number;
    category?: string;
    location?: string;
    starts_after?: string;
    ends_before?: string;
  }) =>
    api.get<{ data: Event[]; total: number }>('/events', { params }).then((r) => r.data),
  get: (id: number) => api.get<Event>(`/events/${id}`).then((r) => r.data),
  create: (data: Partial<Event>) => api.post<Event>('/events', data).then((r) => r.data),
  update: (id: number, data: Partial<Event>) => api.patch<Event>(`/events/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/events/${id}`),
  register: (id: number) => api.post(`/events/${id}/register`).then((r) => r.data),
  cancelRegistration: (id: number) => api.post(`/events/${id}/cancel`).then((r) => r.data),
  submit: (id: number) => api.post<Event>(`/events/${id}/submit`).then((r) => r.data),
  approve: (id: number) => api.post<Event>(`/events/${id}/approve`).then((r) => r.data),
  reject: (id: number, notes: string) =>
    api.post<Event>(`/events/${id}/reject`, { notes }).then((r) => r.data),
  categories: () => api.get<string[]>('/events/categories').then((r) => r.data),
  /** Returns the backend URL for a single-event ICS download (no auth needed). */
  icsUrl: (id: number) => `${api.defaults.baseURL}/events/${id}/ics`,
  /** Returns the backend URL for the full published calendar ICS. */
  calendarIcsUrl: (params?: { club_id?: number; category?: string }) => {
    const base = `${api.defaults.baseURL}/events/calendar.ics`;
    if (!params) return base;
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return qs ? `${base}?${qs}` : base;
  },
};
