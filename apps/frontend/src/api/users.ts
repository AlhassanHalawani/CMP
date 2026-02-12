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

export const usersApi = {
  getMe: () => api.get<User>('/users/me').then((r) => r.data),
  updateMe: (data: { name?: string; avatar_url?: string }) => api.patch<User>('/users/me', data).then((r) => r.data),
  list: (params?: { role?: string; limit?: number; offset?: number }) =>
    api.get<{ data: User[]; total: number }>('/users', { params }).then((r) => r.data),
  updateRole: (id: number, role: string) => api.patch<User>(`/users/${id}/role`, { role }).then((r) => r.data),
};
