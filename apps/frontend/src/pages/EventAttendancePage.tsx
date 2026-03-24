import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { clubsApi } from '@/api/clubs';
import { eventsApi } from '@/api/events';
import { attendanceApi } from '@/api/attendance';
import { useAppToast } from '@/contexts/ToastContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function EventAttendancePage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { hasRole } = useAuth();
  const { showToast } = useAppToast();
  const queryClient = useQueryClient();
  const eventId = parseInt(id!);
  const isAdmin = hasRole('admin');
  const isLeader = hasRole('club_leader');
  const { currentUser } = useCurrentUser();

  const [manualUserId, setManualUserId] = useState('');

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => eventsApi.get(eventId),
  });

  // Fetch the club for ownership check
  const { data: eventClub } = useQuery({
    queryKey: ['clubs', event?.club_id],
    queryFn: () => clubsApi.get(event!.club_id),
    enabled: !!event?.club_id,
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

  const openCheckinMutation = useMutation({
    mutationFn: () => attendanceApi.openCheckin(eventId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events', eventId] });
      showToast('Check-in opened', 'The check-in window is now open.');
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error)
        ? error.response?.data?.error || t('common.error')
        : t('common.error');
      showToast(t('common.error'), message);
    },
  });

  const closeCheckinMutation = useMutation({
    mutationFn: () => attendanceApi.closeCheckin(eventId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events', eventId] });
      showToast('Check-in closed', 'The check-in window is now closed.');
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error)
        ? error.response?.data?.error || t('common.error')
        : t('common.error');
      showToast(t('common.error'), message);
    },
  });

  const finalizeCheckinMutation = useMutation({
    mutationFn: () => attendanceApi.finalizeCheckin(eventId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events', eventId] });
      showToast('Session finalized', 'Attendance has been permanently locked.');
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error)
        ? error.response?.data?.error || t('common.error')
        : t('common.error');
      showToast(t('common.error'), message);
    },
  });

  if (eventLoading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;
  if (!event) return <p>{t('common.noData')}</p>;

  // Ownership check: leader must own the event's club to manage attendance
  const isEventOwner = isLeader && currentUser !== undefined && eventClub?.leader_id === currentUser.id;
  const canManageAttendance = isAdmin || isEventOwner;

  const eventTitle = language === 'ar' ? event.title_ar : event.title;

  const checkinOpen: boolean = !!event.checkin_open;
  const checkinFinalized: boolean = !!event.checkin_finalized;

  const isCheckinTogglePending = openCheckinMutation.isPending || closeCheckinMutation.isPending;

  if (!canManageAttendance) {
    return (
      <div>
        <Link to={`/events/${eventId}`} className="text-sm font-bold underline mb-4 inline-block">
          {t('common.back')}
        </Link>
        <h1 className="mb-2 text-3xl font-black">{t('attendance.title')}</h1>
        <p className="mb-6 text-sm font-bold text-[var(--foreground)]/70">{eventTitle}</p>
        <Card>
          <CardContent>
            <p className="text-sm font-bold text-red-600">
              You do not have permission to manage attendance for this event.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Link to={`/events/${eventId}`} className="text-sm font-bold underline mb-4 inline-block">
        {t('common.back')}
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-3xl font-black">{t('attendance.title')}</h1>
        {checkinFinalized ? (
          <Badge variant="secondary">Finalized</Badge>
        ) : checkinOpen ? (
          <Badge variant="accent">Check-in Open</Badge>
        ) : (
          <Badge variant="neutral" className="border-red-500 text-red-600">Check-in Closed</Badge>
        )}
      </div>
      <p className="mb-6 text-sm font-bold text-[var(--foreground)]/70">{eventTitle}</p>

      {/* Check-in window controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Check-in Window</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={checkinOpen}
              disabled={checkinFinalized || isCheckinTogglePending}
              onCheckedChange={(checked) => {
                if (checked) {
                  openCheckinMutation.mutate();
                } else {
                  closeCheckinMutation.mutate();
                }
              }}
            />
            <span className="text-sm font-bold">
              {checkinOpen ? 'Open' : 'Closed'}
            </span>
          </div>

          {checkinFinalized ? (
            <Alert variant="destructive">
              <AlertDescription>
                This session has been finalized. No further check-ins are allowed.
              </AlertDescription>
            </Alert>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={finalizeCheckinMutation.isPending}
                  className="w-fit"
                >
                  Finalize Session
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Finalize Attendance?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently lock attendance. Cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => finalizeCheckinMutation.mutate()}>
                    Finalize
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>

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
          <CardContent className="flex flex-col gap-3">
            {!checkinOpen && !checkinFinalized && (
              <Alert>
                <AlertDescription>
                  The check-in window is closed. Open it before allowing manual check-ins.
                </AlertDescription>
              </Alert>
            )}
            <div className="flex gap-3">
              <Input
                type="number"
                placeholder={t('attendance.userIdPlaceholder')}
                value={manualUserId}
                onChange={(e) => setManualUserId(e.target.value)}
                disabled={checkinFinalized || !checkinOpen}
              />
              <Button
                onClick={() => manualCheckInMutation.mutate()}
                disabled={manualCheckInMutation.isPending || !manualUserId || checkinFinalized || !checkinOpen}
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
