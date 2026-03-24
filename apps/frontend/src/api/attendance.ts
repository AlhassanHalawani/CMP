import api from './client';

export interface Attendance {
  id: number;
  event_id: number;
  user_id: number;
  checked_in_at: string;
  method: 'qr' | 'manual';
  qr_token: string | null;
}

export interface AttendeeRecord {
  name: string;
  email: string;
  checked_in_at?: string;
  method?: 'qr' | 'manual';
  registered_at?: string;
  attendance_status?: 'present' | 'no_show';
}

export interface AttendanceSummary {
  total_registered: number;
  present: number;
  no_show: number;
  attendance_rate: number;
}

export interface ClubReportRow {
  event_title: string;
  event_starts_at: string;
  name: string;
  email: string;
  status: 'Present' | 'No-show';
  checked_in_at: string | null;
  method: string | null;
}

export interface QrResponse {
  token: string;
  qr: string;
}

async function downloadBlob(url: string, filename: string) {
  const resp = await api.get(url, { responseType: 'blob' });
  const objectUrl = URL.createObjectURL(resp.data as Blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

export const attendanceApi = {
  generateQr: (eventId: number) =>
    api.post<QrResponse>(`/attendance/${eventId}/qr`).then((r) => r.data),
  checkIn: (token: string) =>
    api.post<Attendance>('/attendance/check-in', { token }).then((r) => r.data),
  manualCheckIn: (eventId: number, user_id: number) =>
    api.post<Attendance>(`/attendance/${eventId}/manual`, { user_id }).then((r) => r.data),
  listAttendance: (eventId: number, params?: { status?: 'present' | 'no_show' | 'all' }) =>
    api
      .get<{ data: AttendeeRecord[]; summary: AttendanceSummary }>(`/attendance/${eventId}`, { params })
      .then((r) => r.data),
  downloadAttendanceCsv: (eventId: number) =>
    downloadBlob(`/attendance/${eventId}?format=csv&status=all`, `attendance-event-${eventId}.csv`),
  downloadAttendancePdf: (eventId: number) =>
    downloadBlob(`/attendance/${eventId}?format=pdf&status=all`, `attendance-event-${eventId}.pdf`),
  openCheckin: (eventId: number) =>
    api.post(`/attendance/${eventId}/open`).then((r) => r.data),
  closeCheckin: (eventId: number) =>
    api.post(`/attendance/${eventId}/close`).then((r) => r.data),
  finalizeCheckin: (eventId: number) =>
    api.post(`/attendance/${eventId}/finalize`).then((r) => r.data),
  getClubAttendanceReport: (params: {
    club_id: number;
    starts_after: string;
    ends_before: string;
  }) =>
    api
      .get<{ data: ClubReportRow[]; total: number }>('/attendance', { params })
      .then((r) => r.data),
  downloadClubReportCsv: (clubId: number, startsAfter: string, endsBefore: string) =>
    downloadBlob(
      `/attendance?club_id=${clubId}&starts_after=${startsAfter}&ends_before=${endsBefore}&format=csv`,
      `attendance-club-${clubId}.csv`
    ),
  downloadClubReportPdf: (clubId: number, startsAfter: string, endsBefore: string) =>
    downloadBlob(
      `/attendance?club_id=${clubId}&starts_after=${startsAfter}&ends_before=${endsBefore}&format=pdf`,
      `attendance-club-${clubId}.pdf`
    ),
};
