import api from './client';

export interface User {
  id: number;
  keycloak_id: string;
  email: string;
  name: string;
  role: string;
  avatar_url: string | null;
  created_at: string;
}

export interface UiPreferences {
  user_id?: number;
  theme: string | null;
  color_preset: string;
  radius_base: string;
  box_shadow_x: string;
  box_shadow_y: string;
  font_weight_heading: string;
  font_weight_base: string;
}

export interface MyStats {
  events_registered: number;
  events_attended: number;
  clubs_joined: number;
}

export const usersApi = {
  getMe: () => api.get<User>('/users/me').then((r) => r.data),
  getMyStats: () => api.get<MyStats>('/users/me/stats').then((r) => r.data),
  updateMe: (data: { name?: string; avatar_url?: string }) => api.patch<User>('/users/me', data).then((r) => r.data),
  list: (params?: { role?: string; limit?: number; offset?: number }) =>
    api.get<{ data: User[]; total: number }>('/users', { params }).then((r) => r.data),
  updateRole: (id: number, role: string) => api.patch<User>(`/users/${id}/role`, { role }).then((r) => r.data),
  getPreferences: () => api.get<UiPreferences>('/users/me/preferences').then((r) => r.data),
  updatePreferences: (data: Partial<UiPreferences>) =>
    api.patch<UiPreferences>('/users/me/preferences', data).then((r) => r.data),
  recordLoginActivity: () => api.post('/users/me/login-activity').then((r) => r.data),
  deleteMe: () => api.delete('/users/me'),
  deleteUser: (id: number) => api.delete(`/users/${id}`),
};
