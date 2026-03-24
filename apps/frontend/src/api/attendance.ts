import api from './client';

export interface Attendance {
  id: number;
  event_id: number;
  user_id: number;
  checked_in_at: string;
  method: 'qr' | 'manual';
  qr_token: string | null;
}

export interface QrResponse {
  token: string;
  qr: string;
}

export const attendanceApi = {
  generateQr: (eventId: number) =>
    api.post<QrResponse>(`/attendance/${eventId}/qr`).then((r) => r.data),
  checkIn: (token: string) =>
    api.post<Attendance>('/attendance/check-in', { token }).then((r) => r.data),
  manualCheckIn: (eventId: number, user_id: number) =>
    api.post<Attendance>(`/attendance/${eventId}/manual`, { user_id }).then((r) => r.data),
  listAttendance: (eventId: number) =>
    api.get<{ data: Attendance[]; total: number }>(`/attendance/${eventId}`).then((r) => r.data),
  openCheckin: (eventId: number) =>
    api.post(`/attendance/${eventId}/open`).then((r) => r.data),
  closeCheckin: (eventId: number) =>
    api.post(`/attendance/${eventId}/close`).then((r) => r.data),
  finalizeCheckin: (eventId: number) =>
    api.post(`/attendance/${eventId}/finalize`).then((r) => r.data),
};
