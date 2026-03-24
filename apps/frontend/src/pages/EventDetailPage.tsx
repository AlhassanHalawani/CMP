import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Download } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { clubsApi } from '@/api/clubs';
import { eventsApi } from '@/api/events';
import { attendanceApi } from '@/api/attendance';
import { EventFormDialog } from '@/components/events/EventFormDialog';
import { useAppToast } from '@/contexts/ToastContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const STATUS_BADGE_CLASS: Record<string, string> = {
  draft: 'bg-secondary-background text-foreground',
  submitted: 'bg-blue-500 text-white',
  published: 'bg-green-600 text-white',
  rejected: 'bg-red-600 text-white',
  cancelled: 'bg-secondary-background text-foreground',
  completed: 'bg-secondary-background text-foreground',
};

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { hasRole } = useAuth();
  const { showToast } = useAppToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const eventId = parseInt(id!);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [editError, setEditError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [checkInToken, setCheckInToken] = useState('');
  const [checkInStatus, setCheckInStatus] = useState<'idle' | 'success' | 'error' | 'duplicate'>('idle');
  const [checkInMessage, setCheckInMessage] = useState('');
  const isAdmin = hasRole('admin');
  const isLeader = hasRole('club_leader');
  const { currentUser } = useCurrentUser();

  const { data: event, isLoading } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => eventsApi.get(eventId),
  });

  const { data: clubsData } = useQuery({
    queryKey: ['clubs', 'for-events-form'],
    queryFn: () => clubsApi.list({ limit: 200 }),
  });

  // Check event ownership: find the club for this event, then check leader_id
  const eventClub = clubsData?.data.find((c) => c.id === event?.club_id);
  const isEventOwner = isLeader && currentUser !== undefined && eventClub?.leader_id === currentUser.id;
  const canManageEvent = isAdmin || isEventOwner;

  // For the edit form, leaders only see clubs they own
  const editableClubs = isAdmin
    ? (clubsData?.data ?? [])
    : (clubsData?.data ?? []).filter((c) => c.leader_id === currentUser?.id);

  const registerMutation = useMutation({
    mutationFn: () => eventsApi.register(eventId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events', eventId] });
      showToast('Registered', 'You are registered for this event.');
    },
    onError: (error: unknown) => {
      if (isAxiosError(error)) {
        const message = error.response?.data?.error || 'Failed to register for event.';
        showToast('Registration failed', message);
        return;
      }
      showToast('Registration failed', 'Failed to register for event.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof eventsApi.update>[1]) => eventsApi.update(eventId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      await queryClient.invalidateQueries({ queryKey: ['events', eventId] });
      setEditOpen(false);
      setEditError('');
      showToast('Event updated', 'Event details were saved.');
    },
    onError: (error: unknown) => {
      if (isAxiosError(error)) {
        const message = error.response?.data?.error || 'Failed to update event.';
        setEditError(message);
        showToast('Update failed', message);
        return;
      }
      setEditError('Failed to update event.');
      showToast('Update failed', 'Failed to update event.');
    },
  });

  const checkInMutation = useMutation({
    mutationFn: () => attendanceApi.checkIn(checkInToken),
    onSuccess: () => {
      setCheckInStatus('success');
      setCheckInMessage(t('attendance.checkInSuccess'));
      setCheckInToken('');
    },
    onError: (error: unknown) => {
      if (isAxiosError(error) && error.response?.status === 409) {
        setCheckInStatus('duplicate');
        setCheckInMessage(t('attendance.alreadyCheckedIn'));
        return;
      }
      setCheckInStatus('error');
      const message = isAxiosError(error)
        ? error.response?.data?.error || t('attendance.checkInError')
        : t('attendance.checkInError');
      setCheckInMessage(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => eventsApi.delete(eventId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      showToast('Event deleted', 'The event has been removed.');
      navigate('/events');
    },
    onError: (error: unknown) => {
      if (isAxiosError(error)) {
        const message = error.response?.data?.error || 'Failed to delete event.';
        setDeleteError(message);
        showToast('Delete failed', message);
        return;
      }
      setDeleteError('Failed to delete event.');
      showToast('Delete failed', 'Failed to delete event.');
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => eventsApi.submit(eventId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events', eventId] });
      showToast('Submitted', 'Event submitted for admin review.');
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error)
        ? error.response?.data?.error || 'Failed to submit event.'
        : 'Failed to submit event.';
      showToast('Submit failed', message);
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => eventsApi.approve(eventId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events', eventId] });
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      showToast('Approved', 'Event is now published.');
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error)
        ? error.response?.data?.error || 'Failed to approve event.'
        : 'Failed to approve event.';
      showToast('Approve failed', message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => eventsApi.reject(eventId, rejectNotes),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events', eventId] });
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      setRejectOpen(false);
      setRejectNotes('');
      showToast('Rejected', 'Event has been rejected.');
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error)
        ? error.response?.data?.error || 'Failed to reject event.'
        : 'Failed to reject event.';
      showToast('Reject failed', message);
    },
  });

  if (isLoading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;
  if (!event) return <p>{t('common.noData')}</p>;

  return (
    <div>
      <Link to="/events" className="text-sm font-bold underline mb-4 inline-block">{t('common.back')}</Link>

      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <h1 className="text-3xl font-black">{language === 'ar' ? event.title_ar : event.title}</h1>
        <Badge variant="outline" className={STATUS_BADGE_CLASS[event.status] ?? ''}>
          {event.status}
        </Badge>
        {event.category && (
          <Badge variant="outline">{event.category}</Badge>
        )}
      </div>

      {/* Rejection notes shown to club leader */}
      {event.status === 'rejected' && event.rejection_notes && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Rejected</AlertTitle>
          <AlertDescription>{event.rejection_notes}</AlertDescription>
        </Alert>
      )}

      {/* Admin workflow actions for submitted events */}
      {isAdmin && event.status === 'submitted' && (
        <div className="mb-6 flex gap-3">
          <Button
            variant="default"
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
          >
            {approveMutation.isPending ? t('common.loading') : 'Approve'}
          </Button>
          <Button variant="destructive" onClick={() => setRejectOpen(true)}>
            Reject
          </Button>
        </div>
      )}

      {/* Club leader submit action for draft / rejected events */}
      {isEventOwner && (event.status === 'draft' || event.status === 'rejected') && (
        <div className="mb-6">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="default" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? t('common.loading') : 'Submit for Review'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Submit event for review?</AlertDialogTitle>
                <AlertDialogDescription>
                  An admin will review and approve or reject this event. Once submitted you cannot edit it until it is reviewed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => submitMutation.mutate()}>
                  Submit
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {canManageEvent && (
        <div className="mb-6 flex gap-3">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            {t('common.edit')}
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            {t('common.delete')}
          </Button>
          <Link to={`/events/${eventId}/attendance`}>
            <Button variant="secondary">{t('attendance.manage')}</Button>
          </Link>
        </div>
      )}

      <EventFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        initialValues={event}
        clubs={editableClubs}
        language={language}
        onSubmit={async (payload) => {
          await updateMutation.mutateAsync(payload);
        }}
        isSubmitting={updateMutation.isPending}
        errorMessage={editError}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.delete')} {language === 'ar' ? event.title_ar : event.title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm">This action cannot be undone.</p>
          {deleteError && <p className="text-sm font-bold text-red-600">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteMutation.isPending}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t('common.loading') : t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog — admin enters notes */}
      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => { setRejectOpen(open); if (!open) setRejectNotes(''); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Event</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Provide a reason for rejection..."
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            className="min-h-[120px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={rejectMutation.isPending}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate()}
              disabled={!rejectNotes.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? t('common.loading') : 'Confirm Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="mb-6">
        <CardContent>
          <p className="mb-4">{language === 'ar' ? event.description_ar : event.description}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Location:</strong> {event.location || '—'}</div>
            <div>
              <strong>Seats:</strong>{' '}
              {event.capacity
                ? (() => {
                    const used = event.registration_count ?? 0;
                    const left = event.capacity - used;
                    return left <= 0 ? 'Full' : `${left} / ${event.capacity} remaining`;
                  })()
                : 'Unlimited'}
            </div>
            <div><strong>Start:</strong> {new Date(event.starts_at).toLocaleString()}</div>
            <div><strong>End:</strong> {new Date(event.ends_at).toLocaleString()}</div>
          </div>
        </CardContent>
      </Card>

      {event.status === 'published' && (
        <div className="flex flex-wrap gap-3 mb-6">
          <Button onClick={() => registerMutation.mutate()} disabled={registerMutation.isPending}>
            {registerMutation.isPending ? t('common.loading') : t('events.register')}
          </Button>
          <a href={eventsApi.icsUrl(eventId)} download>
            <Button variant="outline">
              <Download className="size-4 mr-1" />
              Add to Calendar
            </Button>
          </a>
        </div>
      )}

      {/* Student check-in section */}
      {event.status === 'published' && (
        <Card className="mt-4">
          <CardContent>
            <h3 className="font-black mb-3">{t('attendance.checkInTitle')}</h3>
            <div className="flex gap-3 mb-3">
              <Input
                placeholder={t('attendance.tokenPlaceholder')}
                value={checkInToken}
                onChange={(e) => {
                  setCheckInToken(e.target.value);
                  setCheckInStatus('idle');
                  setCheckInMessage('');
                }}
              />
              <Button
                onClick={() => checkInMutation.mutate()}
                disabled={checkInMutation.isPending || !checkInToken.trim()}
              >
                {checkInMutation.isPending ? t('common.loading') : t('attendance.checkInBtn')}
              </Button>
            </div>
            {checkInStatus === 'success' && (
              <p className="text-sm font-bold text-green-600">{checkInMessage}</p>
            )}
            {checkInStatus === 'duplicate' && (
              <p className="text-sm font-bold text-yellow-600">{checkInMessage}</p>
            )}
            {checkInStatus === 'error' && (
              <p className="text-sm font-bold text-red-600">{checkInMessage}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
