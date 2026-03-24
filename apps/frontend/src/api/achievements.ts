import api from './client';

export interface Achievement {
  id: number;
  user_id: number;
  club_id: number;
  title: string;
  title_ar: string;
  description: string | null;
  description_ar: string | null;
  awarded_at: string;
  semester_id: number | null;
}

export const achievementsApi = {
  listForUser: (userId: number) =>
    api.get<{ data: Achievement[] }>(`/achievements/user/${userId}`).then((r) => r.data),

  downloadReport: async (userId: number, params: { semester_id?: number; club_id?: number; report_date?: string }) => {
    const query = new URLSearchParams();
    if (params.semester_id) query.set('semester_id', String(params.semester_id));
    if (params.club_id) query.set('club_id', String(params.club_id));
    if (params.report_date) query.set('report_date', params.report_date);
    const response = await api.get(`/achievements/user/${userId}/report?${query}`, { responseType: 'blob' });
    return response.data as Blob;
  },
};
