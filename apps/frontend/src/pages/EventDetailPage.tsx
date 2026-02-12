import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { eventsApi } from '@/api/events';

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const eventId = parseInt(id!);

  const { data: event, isLoading } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => eventsApi.get(eventId),
  });

  const registerMutation = useMutation({
    mutationFn: () => eventsApi.register(eventId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events', eventId] }),
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
