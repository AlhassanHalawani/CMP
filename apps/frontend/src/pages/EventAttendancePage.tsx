import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { eventsApi } from '@/api/events';
import { attendanceApi } from '@/api/attendance';
import { useAppToast } from '@/contexts/ToastContext';

export function EventAttendancePage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { showToast } = useAppToast();
  const queryClient = useQueryClient();
  const eventId = parseInt(id!);

  const [manualUserId, setManualUserId] = useState('');

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => eventsApi.get(eventId),
  });

  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendance', eventId],
    queryFn: () => attendanceApi.listAttendance(eventId),
  });

  const [qrData, setQrData] = useState<{ token: string; qr: string } | null>(null);

  const generateQrMutation = useMutation({
    mutationFn: () => attendanceApi.generateQr(eventId),
    onSuccess: (data) => {
      setQrData(data);
      showToast(t('attendance.qrGenerated'), t('attendance.qrGeneratedDesc'));
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error)
        ? error.response?.data?.error || t('attendance.qrError')
        : t('attendance.qrError');
      showToast(t('common.error'), message);
    },
  });

  const manualCheckInMutation = useMutation({
    mutationFn: () => attendanceApi.manualCheckIn(eventId, parseInt(manualUserId)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['attendance', eventId] });
      setManualUserId('');
      showToast(t('attendance.checkedIn'), t('attendance.manualSuccess'));
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error)
        ? error.response?.data?.error || t('attendance.manualError')
        : t('attendance.manualError');
      showToast(t('common.error'), message);
    },
  });

  if (eventLoading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;
  if (!event) return <p>{t('common.noData')}</p>;

  const eventTitle = language === 'ar' ? event.title_ar : event.title;

  return (
    <div>
      <Link to={`/events/${eventId}`} className="text-sm font-bold underline mb-4 inline-block">
        {t('common.back')}
      </Link>

      <h1 className="mb-2 text-3xl font-black">{t('attendance.title')}</h1>
      <p className="mb-6 text-sm font-bold text-[var(--foreground)]/70">{eventTitle}</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* QR Generation */}
        <Card>
          <CardHeader>
            <CardTitle>{t('attendance.generateQr')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-4">
              <Button
                onClick={() => generateQrMutation.mutate()}
                disabled={generateQrMutation.isPending}
              >
                {generateQrMutation.isPending ? t('common.loading') : t('attendance.generateQr')}
              </Button>
              {qrData && (
                <Button
                  variant="outline"
                  onClick={() => generateQrMutation.mutate()}
                  disabled={generateQrMutation.isPending}
                >
                  {t('attendance.refreshQr')}
                </Button>
              )}
            </div>
            {qrData && (
              <div className="flex flex-col items-center gap-3 border-2 border-[var(--border)] rounded-base p-4">
                <img src={qrData.qr} alt="QR Code" className="w-48 h-48" />
                <code className="text-xs break-all bg-[var(--secondary-background)] p-2 rounded-base max-w-full">
                  {qrData.token}
                </code>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Check-in */}
        <Card>
          <CardHeader>
            <CardTitle>{t('attendance.manualCheckIn')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                type="number"
                placeholder={t('attendance.userIdPlaceholder')}
                value={manualUserId}
                onChange={(e) => setManualUserId(e.target.value)}
              />
              <Button
                onClick={() => manualCheckInMutation.mutate()}
                disabled={manualCheckInMutation.isPending || !manualUserId}
              >
                {manualCheckInMutation.isPending ? t('common.loading') : t('attendance.checkInBtn')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance List */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            {t('attendance.attendeeList')}
            {attendanceData && (
              <Badge variant="secondary" className="ml-3">
                {attendanceData.total} {t('events.attendees')}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendanceLoading ? (
            <Spinner />
          ) : !attendanceData?.data.length ? (
            <p className="text-sm">{t('common.noData')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[var(--border)]">
                    <th className="text-left py-2 font-bold">{t('attendance.userId')}</th>
                    <th className="text-left py-2 font-bold">{t('attendance.method')}</th>
                    <th className="text-left py-2 font-bold">{t('attendance.time')}</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.data.map((record) => (
                    <tr key={record.id} className="border-b border-[var(--border)]/30">
                      <td className="py-2">{record.user_id}</td>
                      <td className="py-2">
                        <Badge variant={record.method === 'qr' ? 'accent' : 'secondary'}>
                          {record.method === 'qr' ? t('attendance.qrMethod') : t('attendance.manualMethod')}
                        </Badge>
                      </td>
                      <td className="py-2">{new Date(record.checked_in_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
