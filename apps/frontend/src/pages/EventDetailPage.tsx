import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@neo/Card';
import { Badge } from '@neo/Badge';
import { Button } from '@neo/Button';
import { Spinner } from '@neo/Spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@neo/Dialog';
import { clubsApi } from '@/api/clubs';
import { eventsApi } from '@/api/events';
import { EventFormDialog } from '@/components/events/EventFormDialog';
import { useAppToast } from '@/contexts/ToastContext';

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
  const [editError, setEditError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const canManageEvents = hasRole('admin') || hasRole('club_leader');

  const { data: event, isLoading } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => eventsApi.get(eventId),
  });

  const { data: clubsData } = useQuery({
    queryKey: ['clubs', 'for-events-form'],
    queryFn: () => clubsApi.list({ limit: 200 }),
  });

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

  if (isLoading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;
  if (!event) return <p>{t('common.noData')}</p>;

  return (
    <div>
      <Link to="/events" className="text-sm font-bold underline mb-4 inline-block">{t('common.back')}</Link>

      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-3xl font-black">{language === 'ar' ? event.title_ar : event.title}</h1>
        <Badge variant={event.status === 'published' ? 'secondary' : 'outline'}>{event.status}</Badge>
      </div>

      {canManageEvents && (
        <div className="mb-6 flex gap-3">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            {t('common.edit')}
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            {t('common.delete')}
          </Button>
        </div>
      )}

      <EventFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        initialValues={event}
        clubs={clubsData?.data ?? []}
        language={language}
        onSubmit={async (payload) => {
          await updateMutation.mutateAsync(payload);
        }}
        isSubmitting={updateMutation.isPending}
        errorMessage={editError}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.delete')} {language === 'ar' ? event.title_ar : event.title}</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
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

      <Card className="mb-6">
        <CardContent>
          <p className="mb-4">{language === 'ar' ? event.description_ar : event.description}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Location:</strong> {event.location || '—'}</div>
            <div><strong>Capacity:</strong> {event.capacity || 'Unlimited'}</div>
            <div><strong>Start:</strong> {new Date(event.starts_at).toLocaleString()}</div>
            <div><strong>End:</strong> {new Date(event.ends_at).toLocaleString()}</div>
          </div>
        </CardContent>
      </Card>

      {event.status === 'published' && (
        <Button onClick={() => registerMutation.mutate()} disabled={registerMutation.isPending}>
          {registerMutation.isPending ? t('common.loading') : t('events.register')}
        </Button>
      )}
    </div>
  );
}
