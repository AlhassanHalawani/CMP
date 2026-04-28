import api from './client';

export interface ClubFollower {
  id: number;
  club_id: number;
  user_id: number;
  created_at: string;
  muted_at: string | null;
}

export interface ClubFollowerWithUser extends ClubFollower {
  name: string;
  email: string;
  avatar_url: string | null;
}

export const clubFollowersApi = {
  follow: (clubId: number) =>
    api.post<ClubFollower>(`/clubs/${clubId}/follow`).then((r) => r.data),

  unfollow: (clubId: number) =>
    api.delete(`/clubs/${clubId}/follow`),

  getMyFollow: (clubId: number) =>
    api.get<ClubFollower | null>(`/clubs/${clubId}/follow/me`).then((r) => r.data),

  listFollowers: (clubId: number) =>
    api.get<{ data: ClubFollowerWithUser[] }>(`/clubs/${clubId}/followers`).then((r) => r.data),
};
