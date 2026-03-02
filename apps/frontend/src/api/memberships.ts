import api from './client';

export interface Membership {
  id: number;
  club_id: number;
  user_id: number;
  status: 'pending' | 'active' | 'inactive';
  requested_at: string;
  updated_at: string;
}

export interface MembershipWithUser extends Membership {
  name: string;
  email: string;
  avatar_url: string | null;
}

export const membershipsApi = {
  join: (clubId: number) => api.post<Membership>(`/clubs/${clubId}/join`).then((r) => r.data),

  leave: (clubId: number) => api.delete(`/clubs/${clubId}/membership`),

  getMyMembership: (clubId: number) =>
    api.get<Membership | null>(`/clubs/${clubId}/membership/me`).then((r) => r.data),

  listMembers: (clubId: number, status?: string) =>
    api
      .get<{ data: MembershipWithUser[] }>(`/clubs/${clubId}/members`, { params: status ? { status } : undefined })
      .then((r) => r.data),

  updateMembership: (clubId: number, userId: number, status: 'active' | 'inactive') =>
    api.patch<Membership>(`/clubs/${clubId}/members/${userId}`, { status }).then((r) => r.data),
};
