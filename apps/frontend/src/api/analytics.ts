import api from './client';

export interface TrafficSeries {
  date: string;
  desktop: number;
  mobile: number;
}

export interface TrafficData {
  range: string;
  totals: { visitors: number; page_views: number };
  series: TrafficSeries[];
}

export const analyticsApi = {
  recordPageView: (data: { session_id: string; path: string; referrer?: string }) =>
    api.post('/analytics/page-view', data).catch(() => { /* best-effort, never throw */ }),

  getTraffic: (range: '7d' | '30d' | '90d') =>
    api.get<TrafficData>('/admin/traffic', { params: { range } }).then((r) => r.data),
};
