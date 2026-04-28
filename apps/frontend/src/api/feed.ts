import api from './client';

export interface FeedEvent {
  id: number;
  club_id: number;
  title: string;
  title_ar: string | null;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  status: string;
  members_only: boolean;
  club_name: string;
  club_name_ar: string | null;
  club_logo_url: string | null;
  source: 'followed' | 'member';
}

export const feedApi = {
  getEvents: (params?: { limit?: number; offset?: number }) =>
    api
      .get<{ data: FeedEvent[]; total: number; limit: number; offset: number }>('/feed/events', { params })
      .then((r) => r.data),
};
