import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { clubsApi } from '@/api/clubs';
import { eventsApi, type Event } from '@/api/events';
import { EventFormDialog } from '@/components/events/EventFormDialog';
import { useAppToast } from '@/contexts/ToastContext';

export function EventsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { hasRole } = useAuth();
  const { showToast } = useAppToast();
  const queryClient = useQueryClient();
  const canManageEvents = hasRole('admin') || hasRole('club_leader');
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');

  const { data: allEvents, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.list({ limit: 50 }),
  });

  const { data: clubsData } = useQuery({
    queryKey: ['clubs', 'for-events-form'],
    queryFn: () => clubsApi.list({ limit: 200 }),
  });

  const createMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      setCreateOpen(false);
      setCreateError('');
      showToast('Event created', 'The event was created successfully.');
    },
    onError: (error: unknown) => {
      if (isAxiosError(error)) {
        const message = error.response?.data?.error || 'Failed to create event.';
        setCreateError(message);
        showToast('Create failed', message);
        return;
      }
      setCreateError('Failed to create event.');
      showToast('Create failed', 'Failed to create event.');
    },
  });

  if (isLoading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;

  const sourceEvents = canManageEvents
    ? (allEvents?.data ?? [])
    : (allEvents?.data.filter((e) => e.status === 'published') ?? []);
  const upcoming = sourceEvents.filter((e) => new Date(e.starts_at) > new Date());
  const past = sourceEvents.filter((e) => new Date(e.starts_at) <= new Date());

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-black">{t('events.title')}</h1>
        {canManageEvents && (
          <Button onClick={() => setCreateOpen(true)}>{t('events.createEvent')}</Button>
        )}
      </div>

      <EventFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        clubs={clubsData?.data ?? []}
        language={language}
        onSubmit={async (payload) => {
          await createMutation.mutateAsync(payload);
        }}
        isSubmitting={createMutation.isPending}
        errorMessage={createError}
      />

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">{t('events.upcoming')} ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">{t('events.past')} ({past.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <EventGrid events={upcoming} language={language} />
        </TabsContent>
        <TabsContent value="past">
          <EventGrid events={past} language={language} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EventGrid({ events, language }: { events: Event[]; language: 'en' | 'ar' }) {
  const { t } = useTranslation();

  if (events.length === 0) return <p className="mt-4 text-sm">{t('common.noData')}</p>;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <Link key={event.id} to={`/events/${event.id}`}>
          <Card className="h-full cursor-pointer hover:-translate-y-0.5 transition-transform">
            <CardHeader>
              <CardTitle>{language === 'ar' ? event.title_ar : event.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm line-clamp-2 mb-2">
                {language === 'ar' ? event.description_ar : event.description}
              </p>
              <div className="flex gap-2 flex-wrap">
                {event.location && <Badge variant="accent">{event.location}</Badge>}
                <Badge variant="secondary">{new Date(event.starts_at).toLocaleDateString()}</Badge>
                {event.capacity && <Badge variant="outline">{event.capacity} seats</Badge>}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
