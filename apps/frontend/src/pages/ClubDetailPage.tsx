import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { clubsApi } from '@/api/clubs';
import { eventsApi } from '@/api/events';
import { ClubFormDialog } from '@/components/clubs/ClubFormDialog';
import { useAppToast } from '@/contexts/ToastContext';

export function ClubDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { hasRole } = useAuth();
  const { showToast } = useAppToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clubId = parseInt(id!);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editError, setEditError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const canManage = hasRole('admin') || hasRole('club_leader');
  const isAdmin = hasRole('admin');

  const { data: club, isLoading } = useQuery({
    queryKey: ['clubs', clubId],
    queryFn: () => clubsApi.get(clubId),
  });

  const { data: eventsData } = useQuery({
    queryKey: ['events', 'club', clubId],
    queryFn: () => eventsApi.list({ club_id: clubId }),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof clubsApi.update>[1]) => clubsApi.update(clubId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clubs'] });
      await queryClient.invalidateQueries({ queryKey: ['clubs', clubId] });
      setEditOpen(false);
      setEditError('');
      showToast('Club updated', 'Club details were saved.');
    },
    onError: (error: unknown) => {
      if (isAxiosError(error)) {
        const message = error.response?.data?.error || 'Failed to update club.';
        setEditError(message);
        showToast('Update failed', message);
        return;
      }
      setEditError('Failed to update club.');
      showToast('Update failed', 'Failed to update club.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => clubsApi.delete(clubId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clubs'] });
      showToast('Club deleted', 'The club has been removed.');
      navigate('/clubs');
    },
    onError: (error: unknown) => {
      if (isAxiosError(error)) {
        const message = error.response?.data?.error || 'Failed to delete club.';
        setDeleteError(message);
        showToast('Delete failed', message);
        return;
      }
      setDeleteError('Failed to delete club.');
      showToast('Delete failed', 'Failed to delete club.');
    },
  });

  if (isLoading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;
  if (!club) return <p>{t('common.noData')}</p>;

  return (
    <div>
      <Link to="/clubs" className="text-sm font-bold underline mb-4 inline-block">{t('common.back')}</Link>
      <h1 className="mb-2 text-3xl font-black">{language === 'ar' ? club.name_ar : club.name}</h1>
      <p className="mb-6 text-lg">{language === 'ar' ? club.description_ar : club.description}</p>

      {canManage && (
        <div className="mb-6 flex gap-3">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            {t('common.edit')}
          </Button>
          {isAdmin && (
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              {t('common.delete')}
            </Button>
          )}
        </div>
      )}

      <ClubFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        initialValues={club}
        onSubmit={async (payload) => {
          await updateMutation.mutateAsync(payload);
        }}
        isSubmitting={updateMutation.isPending}
        errorMessage={editError}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.delete')} {language === 'ar' ? club.name_ar : club.name}</DialogTitle>
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

      <h2 className="mb-4 text-xl font-black">{t('clubs.events')}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {eventsData?.data.map((event) => (
          <Link key={event.id} to={`/events/${event.id}`}>
            <Card className="cursor-pointer hover:-translate-y-0.5 transition-transform">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{language === 'ar' ? event.title_ar : event.title}</CardTitle>
                  <Badge variant={event.status === 'published' ? 'secondary' : 'outline'}>{event.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{event.location} &middot; {new Date(event.starts_at).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {eventsData?.data.length === 0 && <p className="text-sm">{t('common.noData')}</p>}
      </div>
    </div>
  );
}
