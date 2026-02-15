import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { clubsApi } from '@/api/clubs';
import { ClubFormDialog } from '@/components/clubs/ClubFormDialog';
import { useAppToast } from '@/contexts/ToastContext';

export function ClubsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { hasRole } = useAuth();
  const { showToast } = useAppToast();
  const queryClient = useQueryClient();
  const isAdmin = hasRole('admin');
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => clubsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: clubsApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clubs'] });
      setCreateOpen(false);
      setCreateError('');
      showToast('Club created', 'The club was created successfully.');
    },
    onError: (error: unknown) => {
      if (isAxiosError(error)) {
        const message = error.response?.data?.error || 'Failed to create club.';
        setCreateError(message);
        showToast('Create failed', message);
        return;
      }
      setCreateError('Failed to create club.');
      showToast('Create failed', 'Failed to create club.');
    },
  });

  if (isLoading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-black">{t('clubs.title')}</h1>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)}>
            {t('clubs.createClub')}
          </Button>
        )}
      </div>

      <ClubFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        onSubmit={async (payload) => {
          await createMutation.mutateAsync(payload);
        }}
        isSubmitting={createMutation.isPending}
        errorMessage={createError}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data?.data.map((club) => (
          <Link key={club.id} to={`/clubs/${club.id}`}>
            <Card className="h-full transition-transform hover:-translate-y-1 cursor-pointer">
              <CardHeader>
                <CardTitle>{language === 'ar' ? club.name_ar : club.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm line-clamp-3">
                  {language === 'ar' ? club.description_ar : club.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {data?.data.length === 0 && <p>{t('common.noData')}</p>}
      </div>
    </div>
  );
}
