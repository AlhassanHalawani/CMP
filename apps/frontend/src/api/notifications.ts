import api from './client';

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  body: string | null;
  type: string;
  is_read: number;
  created_at: string;
}

export const notificationsApi = {
  list: (params?: { limit?: number; offset?: number }) =>
    api.get<{ data: Notification[]; unread: number }>('/notifications', { params }).then((r) => r.data),
  markRead: (id: number) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};
