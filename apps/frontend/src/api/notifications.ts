import api from './client';

export interface NotificationAction {
  type: 'membership_request';
  club_id: number;
  requester_id: number;
  requester_name: string;
  club_name: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  body: string | null;
  type: string;
  is_read: number;
  target_url: string | null;
  actions_json: string | null;
  created_at: string;
}

export interface NotificationPreference {
  event_type: string;
  channel: 'in_app' | 'email';
  enabled: number;
}

export function parseNotificationActions(n: Notification): NotificationAction | null {
  if (!n.actions_json) return null;
  try {
    return JSON.parse(n.actions_json) as NotificationAction;
  } catch {
    return null;
  }
}

export const notificationsApi = {
  list: (params?: { limit?: number; offset?: number }) =>
    api.get<{ data: Notification[]; unread: number }>('/notifications', { params }).then((r) => r.data),
  markRead: (id: number) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  getPreferences: () =>
    api.get<NotificationPreference[]>('/notifications/preferences').then((r) => r.data),
  updatePreference: (data: { event_type: string; channel: 'in_app' | 'email'; enabled: boolean }) =>
    api.patch('/notifications/preferences', data),
};
